import {Directive, ElementRef, forwardRef, HostListener, Input} from '@angular/core';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from '@angular/forms';

export const CUSTOM_INPUT_CURRENCY_CONTROL_VALUE_ACCESSOR: any = {
  provide: NG_VALUE_ACCESSOR,
  useExisting: forwardRef(() => CoreCurrencyDirective),
  multi: true
};

@Directive({
  selector: '[coreCurrency]',
  providers: [CUSTOM_INPUT_CURRENCY_CONTROL_VALUE_ACCESSOR]
})
export class CoreCurrencyDirective implements ControlValueAccessor {

  @Input()
  public allowNegative = false;

  /**
   *  for browser language set to undefined
   */
  @Input()
  public locale = undefined;

  @Input()
  public maxNumber = 999999999999.99;

  @Input()
  public minNumber = -999999999999.99;

  /**
   *  last seperator will be assumed to be decimal instead of thousand grouping seperator
   */
  @Input()
  public assumeDecimalOverGroup = false;

  private positiveDecimal = new RegExp(/^\d*[\.|,]?\d*$/g);
  private allDecimal = new RegExp(/^-?\d*[\.|,]?\d*$/g);

  private specialKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Del', 'Tab'];

  public onChange: any = (_) => {
  };
  public onTouched: any = () => {
  };

  constructor(private el: ElementRef) {
  }

  numberToString(f: number) {
    try {
      if (f == null) {
        return null;
      }

      return f.toLocaleString(this.locale,
        {maximumFractionDigits: 2, minimumFractionDigits: 2, useGrouping: true});
    } catch (e) {
      return f.toFixed(2);
    }
  }

  stringToNumber(val?: string) {
    const raw: string = val || this.el.nativeElement.value || '';
    // console.log('raw', raw);
    let base = raw.replace(/[^\d.,-]/g, '')
      .replace(/,[,.]+/g, ',')
      .replace(/\.[,.]+/g, '.');

    let sign = '';

    if (base.startsWith('-')) {
      sign = '-';
    }

    base = sign + base.replace(/-/g, '');

    // console.log('base', base);

    const last = Math.max(base.lastIndexOf('.'), base.lastIndexOf(','));

    let integer = '';
    let fraction: string = null;

    // console.log('last', last, 'length', base.length);

    if (last < 0) {
      integer = base;
      // console.log('integer', base);
    } else if (last + 4 !== base.length) {
      integer = base.substr(0, last).replace(/[^\d-]/g, '');
      fraction = base.substr(last + 1).replace(/[^\d]/g, '');
      // console.log('integer', integer, 'fraction', fraction);
    } else {
      let decimalSeperator = ',';

      try {
        decimalSeperator = new Intl.NumberFormat(this.locale).format(1.1).replace(/1/g, '');
      } catch (e) {

      }

      if (this.assumeDecimalOverGroup || base.charAt(last) === decimalSeperator) {
        integer = base.substr(0, last).replace(/[^\d-]/g, '');
        fraction = base.substr(last + 1).replace(/[^\d]/g, '');
        // console.log('unsure', integer, 'fraction', fraction);
      } else {
        integer = base.replace(/[^\d-]/g, '');
      }
    }

    let f = parseFloat(fraction ? integer + '.' + fraction : integer);

    if (isNaN(f)) {
      return null;
    }

    if (f > this.maxNumber) {
      f = this.maxNumber;
    }

    if (f < this.minNumber) {
      f = this.minNumber;
    }

    return f;
  }

  parseValue(val?: string) {
    const f = this.stringToNumber();
    const s = this.numberToString(f);
    return s;
  }

  @HostListener('focus')
  onFocus() {
    const v = this.parseValue();

    if (v == null) {
      this.el.nativeElement.value = null;
    } else {
      this.el.nativeElement.value = this.parseValue(); // TODO: replace group seperator?
    }

    this.el.nativeElement.select();
  }

  @HostListener('focusout')
  onFocusout() {
    this.el.nativeElement.value = this.parseValue();
    const s = this.stringToNumber();
    this.onChange(s);
  }

  @HostListener('paste', ['$event'])
  onPaste(e: ClipboardEvent) {
    this.el.nativeElement.value = null;

    setTimeout(() => {
      try {
        this.el.nativeElement.value = this.parseValue();
        // const s = this.stringToNumber();
        // this.onChange(s);
      } catch (e) {

      }
    }, 0);
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event) {

    console.log(event);

    // allow cut copy past
    if (event.composed && (event.key === 'x' || event.key === 'v' || event.key === 'c') && event.ctrlKey) {
      return;
    }

    // allow navigation
    if (this.specialKeys.indexOf(event.key) !== -1) {
      return;
    }

    const matches = this.allowNegative ? event.key.match(this.allDecimal) : event.key.match(this.positiveDecimal);

    if (this.el.nativeElement.value && this.el.nativeElement.value.length > 30) {
      event.preventDefault();
      return;
    }

    if (!matches) {
      event.preventDefault();
    }
  }

  @HostListener('blur')
  onBlur($event) {
    this.el.nativeElement.value = this.parseValue();
    const s = this.stringToNumber();
    this.onChange(s);
  }

  writeValue(val: number): void {
    // write initial localized format
    this.el.nativeElement.value = this.numberToString(val);
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }
}
