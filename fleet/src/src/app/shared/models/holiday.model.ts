export interface HolidayResponseModel{
    Name: string;
    Type: string;
    StartDate: string;
    EndDate: string;
}

export interface SetHolidayModel{
    Name: string;
    Type: string;
    StartDate: Date;
    EndDate: Date;
}

export interface SetHolidayRequestModel{
    start: string;
    end: string;
    holidays: HolidayResponseModel[];
}

export interface HolidayRequestModel{
    StartDate: string;
    EndDate: string;
}