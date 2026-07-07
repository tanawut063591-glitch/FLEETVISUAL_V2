import { Injectable } from '@angular/core';

@Injectable()
export class FvTimeService {

    constructor() { }

    getLastSeen(timestamp: Date) {
        try {
            let now = new Date().getTime()
            let diffTime = (now - timestamp.getTime())
            let date_diff = new Date(diffTime);
            let days = Math.floor(diffTime / 1000 / 60 / (60 * 24));
            let hour = Math.floor(diffTime / 1000 / 60 / 60);
            let minute = Math.floor(diffTime / 1000 / 60);
            let real_hour = diffTime / 1000 / 60 / 60
            let res: any = {}
            res.color = "#05F6E0"
            if (real_hour >= 24) {
                return days + " D"
            }
            else if (real_hour > 1.01) {
                return hour + " H"
            }
            else if (real_hour < 0)
                return 0 + "M"
            else {
                return minute + " M"
            }
        }
        catch (ex) {
            return ''
        }
    }

    getLastSeenFromString(timestamp: string) {
        try {
            let _timestamp: Date = new Date(timestamp)
            let now = new Date().getTime()
            let diffTime = (now - _timestamp.getTime())
            let date_diff = new Date(diffTime);
            let days = Math.floor(diffTime / 1000 / 60 / (60 * 24));
            let hour = Math.floor(diffTime / 1000 / 60 / 60);
            let minute = Math.floor(diffTime / 1000 / 60);
            let real_hour = diffTime / 1000 / 60 / 60
            let res: any = {}
            res.color = "#05F6E0"

            if (real_hour >= 24) {
                return days + " D"
            }
            else if (real_hour > 1.01) {
                return hour + " H"
            }
            else if (real_hour < 0)
                return 0 + "M"
            else {
                return minute + " M"
            }
        }
        catch (ex) {
            return ''
        }
    }
}

