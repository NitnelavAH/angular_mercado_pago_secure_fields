import { Inject, Injectable, PLATFORM_ID } from '@angular/core';

import { isPlatformBrowser } from '@angular/common';
import { CardMp, CreateCardTokenI } from '../../interfaces/mp.interface';


declare var MercadoPago: any;

@Injectable({
  providedIn: 'root'
})
export class MercadoPagoService {


  mercadoPago: any;

  constructor(
    @Inject(PLATFORM_ID) private platformId: string,
  ) { }

  public initMp(apikey: string): void {
    this.mercadoPago = new MercadoPago(apikey, {
      locale: 'es-MX',
    });
  }

  public getMercadoPago(apikey: string) {
    this.mercadoPago = new MercadoPago(apikey, {
      locale: 'es-MX',
    });

    return this.mercadoPago;
  }

  public createCardToken(body: CardMp): Promise<CreateCardTokenI> {
    return new Promise((resolve, reject) => {
      this.mercadoPago.createCardToken(body)
        .then((res: any) => resolve(res))
        .catch((err: any) => reject(err))
    });
  }


  public get getDeviceId(): string {
    if (isPlatformBrowser(this.platformId)) {
      return (window as any).deviceId;
    }
    return '';
  }

}
