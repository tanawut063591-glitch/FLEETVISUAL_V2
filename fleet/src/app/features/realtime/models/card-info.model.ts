export interface CardInfo {
    prefix: string;
    details: CardDetail[];
    
}

export interface CardDetail {
    row: number;
    col: number;
    title : string;
    type: string;
}


