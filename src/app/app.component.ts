import { AfterViewInit, Component, Inject, OnDestroy, OnInit, PLATFORM_ID, signal } from '@angular/core';



import { ActivatedRoute, Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { MercadoPagoService } from './shared/services/mercado-pago.service';


declare const MercadoPago: any;

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  public amount: number = 10;
  public apiKey = '';


  public valid = signal(false);
  public loaded = signal(false);
  public showSave = signal(false);


  public showLoader = signal(false);
  private itsOpen = false;


  //MP
  private mp: any;
  private cardNumberElement: any;
  private expirationDateElement: any;
  private securityCodeElement: any;
  private currentBin: string = '';

  constructor(
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private mercadoPagoService: MercadoPagoService,
    @Inject(PLATFORM_ID) private platformId: string
  ) {

  }
  


  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadParams();
    }
  }

  ngOnDestroy(): void {

  }

  public async createCardToken() {
    this.clearErrors();

    const tokenElement = document.getElementById('token') as HTMLInputElement;
    const formElement = document.getElementById('form-checkout') as HTMLFormElement;
    console.log(tokenElement.value)

    try {
      console.log('hola e')
      const token = await this.mp.fields.createCardToken({
        cardNumber: (document.getElementById('form-checkout__cardNumber') as HTMLInputElement).value,
        cardExpirationDate: (document.getElementById('form-checkout__expirationDate') as HTMLInputElement).value,
        cardholderName: (document.getElementById('form-checkout__cardholderName') as HTMLInputElement).value,
        securityCode: (document.getElementById('form-checkout__securityCode') as HTMLInputElement).value,
      });

      let tokenOpenId = '';
      if(this.itsOpen) {
        const tokenOpen = await this.mp.fields.createCardToken({
          cardNumber: (document.getElementById('form-checkout__cardNumber') as HTMLInputElement).value,
          cardExpirationDate: (document.getElementById('form-checkout__expirationDate') as HTMLInputElement).value,
          cardholderName: (document.getElementById('form-checkout__cardholderName') as HTMLInputElement).value,
          securityCode: (document.getElementById('form-checkout__securityCode') as HTMLInputElement).value,
        });

        tokenOpenId = tokenOpen.id;
      }

      console.log(token, tokenOpenId)
      tokenElement.value = token.id;
      const deviceId = this.mercadoPagoService.getDeviceId;

    } catch (e) {
      console.log(e)
      if (Array.isArray(e)) {
        console.log(e)
        this.showErrors(e);
      } else {
        console.error('Error creating card token:', e);
        this.router.navigate(['nueva-tarjeta', 'error'], {
          queryParams: { token: '' },
        });
      }

    }

  }


  private async initForm() {
    if (!this.apiKey || !isPlatformBrowser(this.platformId)) return;
    console.log('load', this.apiKey)
    this.mp = new MercadoPago(this.apiKey, { locale: 'es-MX' });

    await this.mountFields();
    this.loaded.update(s => true);
    const formElement = document.getElementById('form-checkout')!;
    formElement.addEventListener('change', this.onValidForm.bind(this));
  }


  private async mountFields() {
    this.cardNumberElement = this.mp.fields.create('cardNumber', {
      placeholder: "Número de tarjeta"
    }).mount('form-checkout__cardNumber');

    this.expirationDateElement = this.mp.fields.create('expirationDate', {
      placeholder: "MM/YY Fecha de vto."
    }).mount('form-checkout__expirationDate');

    this.securityCodeElement = this.mp.fields.create('securityCode', {
      placeholder: "CVV"
    }).mount('form-checkout__securityCode');

    this.cardNumberElement.on('binChange', this.onBinChange.bind(this));

    this.securityCodeElement.on('blur', this.blurCvv.bind(this));

    this.securityCodeElement.on('focus', this.clearError.bind(this));
    this.cardNumberElement.on('focus', this.clearError.bind(this));
    this.expirationDateElement.on('focus', this.clearError.bind(this));

    (document.getElementById('form-checkout__cardholderName') as HTMLInputElement).onchange = (e) => {
      const name = (e.target as HTMLInputElement).value;
  
    }

  }

  private onValidForm(data: any) {
    if (data.isTrusted) {
      console.log('Formulario válido');
      this.valid.update(s => true);
    }
  }

  private async onBinChange(data: any) {
    console.log(data, this.cardNumberElement)
    const bin = data.bin;
    /*     const paymentMethodElement = document.getElementById('paymentMethodId') as HTMLInputElement; */
    /*  const issuerElement = document.getElementById('form-checkout__issuer') as HTMLSelectElement;
     const installmentsElement = document.getElementById('form-checkout__installments') as HTMLSelectElement; */

    /*  if (!bin && paymentMethodElement.value) {
       this.clearSelects(issuerElement, installmentsElement);
       paymentMethodElement.value = '';
     } */

    if (bin && bin !== this.currentBin) {
      try {
        const { results } = await this.mp.getPaymentMethods({ bin });
        console.log(results)
        const paymentMethod = results[0];

       

        const icon = this.getIconCard(bin);
  

        /* paymentMethodElement.value = paymentMethod.id; */

        this.updatePCIFieldsSettings(paymentMethod);
        await this.updateIssuer(paymentMethod, bin);
        await this.updateInstallments(paymentMethod, bin);

        this.currentBin = bin;
      } catch (e) {
        console.error('Error getting payment methods:', e);
      }
    }
  }

  private clearSelects(issuerEl: HTMLSelectElement, installmentsEl: HTMLSelectElement) {
    this.clearOptions(issuerEl, "Banco emisor");
    this.clearOptions(installmentsEl, "Cuotas");
  }

  private clearOptions(selectEl: HTMLSelectElement, placeholder: string) {
    selectEl.innerHTML = '';
    const option = document.createElement('option');
    option.textContent = placeholder;
    option.disabled = true;
    option.selected = true;
    selectEl.appendChild(option);
  }

  private updatePCIFieldsSettings(paymentMethod: any) {
    const settings = paymentMethod.settings[0];
    this.cardNumberElement.update({ settings: settings.card_number });
    this.securityCodeElement.update({ settings: settings.security_code });
  }

  private async updateIssuer(paymentMethod: any, bin: string) {
    const issuerElement = document.getElementById('form-checkout__issuer')!;
    let issuers = [paymentMethod.issuer];

    if (paymentMethod.additional_info_needed.includes('issuer_id')) {
      const { id: paymentMethodId } = paymentMethod;
      issuers = await this.mp.getIssuers({ paymentMethodId, bin });
      console.log(issuers)
    }

    /*   this.populateSelect(issuerElement, issuers, { label: 'name', value: 'id' }); */
  }

  private async updateInstallments(paymentMethod: any, bin: string) {
    try {
      /*       const amount = (document.getElementById('transactionAmount') as HTMLInputElement).value; */
      console.log(this.amount)
      const installments = await this.mp.getInstallments({ amount: this.amount.toString(), bin, paymentTypeId: paymentMethod.payment_type_id });
      console.log(installments)
      /*  const installmentOptions = installments[0].payer_costs;
       const installmentsElement = document.getElementById('form-checkout__installments')!;
       this.populateSelect(installmentsElement, installmentOptions, { label: 'recommended_message', value: 'installments' }); */
    } catch (e) {
      console.error('Error getting installments:', e);
    }
  }

  private populateSelect(selectEl: any, options: any[], keys = { label: 'name', value: 'id' }) {
    this.clearOptions(selectEl, 'Selecciona una opción');
    options.forEach(option => {
      const opt = document.createElement('option');
      opt.value = option[keys.value];
      opt.textContent = option[keys.label];
      selectEl.appendChild(opt);
    });
  }

  private clearErrors() {
    document.querySelectorAll('.error').forEach(el => el.textContent = '');
    document.querySelectorAll('.errorField').forEach(el => el.classList.remove('errorField'));
  }

  private clearError(data: any) {
    const field = data.field;
    if (!field) return;
    const errorElement = document.getElementById(`${field}-error`);
    const fieldElement = document.getElementById(`form-checkout__${field}`);
    if (errorElement && fieldElement) {
      errorElement.textContent = '';
      fieldElement.classList.remove('errorField');
    }

    if (field === 'securityCode') {

      console.log('cvv', true)
    }
  }

  private blurCvv(data: any) {

  }

  private showErrors(errors: { field: string, message: string, cause: string }[]) {
    try {
      const sorted = [...errors].sort((a, b) => {
        const priority = (cause: string) =>
          cause === 'invalid_length' ? 0 :
            cause === 'invalid_type' ? 1 :
              cause === 'invalid_value' ? 2 :
                3;

        return priority(a.cause) - priority(b.cause);
      });
      sorted.forEach(async error => {
        const field = error.field;
        const message = error.message;

        const errorElement = document.getElementById(`${field}-error`);
        const fieldElement = document.getElementById(`form-checkout__${field}`);
        if (!errorElement || !fieldElement) return;

        fieldElement.classList.add('errorField');
        console.log(error.cause, field)
        let messageTranslate = '';
        switch (error.cause) {
          case 'invalid_type':
          case 'invalid_length':
            messageTranslate = 'formatInvalid';
            break;
          case 'invalid_value':
            messageTranslate = 'requiredField';
            break;
          default:
            messageTranslate = 'requiredField';
        }

        errorElement.textContent = messageTranslate


      });
    } catch (error) {
      //ERROR ON ERRORS FIELDS
    }
  }


  private loadParams() {
    const queryParams = this.activatedRoute.snapshot.queryParams;
    if (Object.keys(queryParams).length === 0) {
      this.router.navigate(['nueva-tarjeta', 'error'], {
        queryParams: { token: '-' },
      });
      return;
    }

    const data = queryParams['data'];
    if (data) {
      this.initForm();

    }

    const retry = queryParams['retry'];

    if (Array.isArray(retry) && retry?.length >= 3) {
      this.showLoader.update(s => true);
      return
    };

    //RELOAD PAGE TO ALLOW APP DETECT URL CHANGES AND GET THE DATA(if the first time the url change detection fails)
    if (queryParams['token']) {
      this.showLoader.update(s => true);

      setTimeout(() => {
        this.retryRedirectToApp();
      }, 5000);
    }
  }


  private retryRedirectToApp() {
    const appLink = `${window.location.href}&retry=${new Date().getTime()}`

    setTimeout(() => {
      window.location.href = appLink;
    }, 100);
  }

  private getIconCard(card: string) {
    const strCard = card.charAt(0);

    switch (strCard) {
      case '3':
        return 'amex';
      case '4':
        return 'visa';
      case '5':
        return 'master';
      default:
        return 'card';
    }
  }

}
