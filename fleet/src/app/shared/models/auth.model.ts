export interface AuthRequestModel{
    user: string;
    password: string;
}

export interface AuthRespondModel{
    Access: AccessModel
}

export interface AccessModel{
    Role?: string;
    Token: string;
    RefreshToken?: string;
    Pages: PageAccessModel[];
    Sites?: string[];
}

export interface PageAccessModel{
    [name: string]: boolean;
}