import { LocaleHelper } from './locale.helper.ts';

export class MoneyHelper {
  // Money stays a string end to end; "100.00" is split, never turned into a float.
  static rupees(amount: string): string {
    const [whole = '0', paisa = '00'] = amount.split('.');
    // Nepali grouping: the last three digits, then pairs (1,00,000 for one lakh).
    const lastThree = whole.slice(-3);
    const rest = whole.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    const grouped = rest ? `${rest},${lastThree}` : lastThree;
    const value = paisa === '00' ? grouped : `${grouped}.${paisa}`;
    return `${LocaleHelper.pick('रु.', 'Rs.')} ${LocaleHelper.digits(value)}`;
  }
}
