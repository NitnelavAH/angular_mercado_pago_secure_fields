export interface CardMp {
    cardNumber?: string;
    cardExpirationMonth?: string;
    cardExpirationYear?: string;
    cardholderName?: string;
    securityCode: string;
    cardId?: string;
}

export interface CreateCardTokenI {
    id:                   string;
    public_key:           string;
    first_six_digits:     string;
    last_four_digits:     string;
    cardholder:           Cardholder;
    status:               string;
    date_created:         Date;
    date_last_updated:    Date;
    date_due:             Date;
    luhn_validation:      boolean;
    live_mode:            boolean;
    require_esc:          boolean;
    card_number_length:   number;
    security_code_length: number;
}


export interface Cardholder {
    identification: Identification;
    name:           string;
}

export interface Identification {
}

export interface HelpCardMp {
    number: string,
    date: string,
    cvv: string,
    name: string,
  }
  
