import { BsDateHelper } from '@ward-sewa/nepal-utils';
import { LocaleHelper } from './locale.helper.ts';

export class DateTimeHelper {
  // Nepal's date and clock, whatever timezone the viewer's device is set to.
  static bs(iso: string): string {
    const date = BsDateHelper.fromInstant(new Date(iso));
    const time = new Date(iso).toLocaleTimeString(LocaleHelper.pick('ne-NP', 'en-GB'), {
      timeZone: 'Asia/Kathmandu',
      hour: '2-digit',
      minute: '2-digit',
    });
    const day = BsDateHelper.format(date, { locale: LocaleHelper.pick('ne', 'en'), style: 'long' });
    return `${day}, ${time}`;
  }

  static bsDay(bsIsoDate: string): string {
    return BsDateHelper.format(BsDateHelper.parse(bsIsoDate), {
      locale: LocaleHelper.pick('ne', 'en'),
      style: 'long',
    });
  }
}
