import { CardInfo } from "./models/card-info.model";

export class CardConfiguration{

    cardInfos: CardInfo[] = [];

    constructor() {

        this.cardInfos.push(
            this.SC_GLORY_6, 
            this.SC_GLORY_2,
            this.SC_BRAVE, 
            this.SC_GLORY_7, 
            this.SC_EMERALD, 
            this.SC_BONGKOT, 
            this.SC_PAILIN, 
            this.SC_WINTER, 
            this.SC_GLORY_1, 
            this.SC_GLORY_3, 
            this.SC_CHOLUEDEE,
            this.SC_SULTAN,
            this.SC_DUMMY,
            this.SC_RAJA
        );

        this.cardInfos.push(
            this.BB_MAKMUR,
            this.BB_GOMEN,
            this.BB_MULIA,
            this.BB_KAIMOOK,
            this.BB_INTAN,
            this.BB_LIBERTY233,
            this.BB_TONGKAM,
            this.BB_LAZURIT,
            this.BB_TIARA,
            this.BB_PHET,
            this.BB_JINDAMANEE,
            this.BB_ZAMRUD
        );

        this.cardInfos.push(
            this.MV_GEMIA
        );
    }

    getConfig():CardInfo[]{
        return this.cardInfos;
    }
    
        
    SC_GLORY_6 = { 
        prefix: 'A01-', 
        details:  [
            { row: 1, col: 1 , title: 'PORT MAIN ENGINE', type: 'ME1' },
            { row: 1, col: 2 , title: 'CENTER MAIN ENGINE', type: 'ME1' },
            { row: 1, col: 3 , title: 'STARBOARD MAIN ENGINE', type: 'ME1' },
            { row: 2, col: 1 , title: 'PORT AUX. ENGINE', type: 'AE1' },
            { row: 2, col: 2 , title: '', type: '' },
            { row: 2, col: 3 , title: 'STARBOARD AUX. ENGINE', type: 'AE1' }
        ]
    };

    SC_GLORY_2 = { 
        prefix: 'A02-', 
        details: [
            { row: 1, col: 1 , title: 'PORT MAIN ENGINE', type: 'ME1' },
            { row: 1, col: 2 , title: 'CENTER MAIN ENGINE', type: 'ME1' },
            { row: 1, col: 3 , title: 'STARBOARD MAIN ENGINE', type: 'ME1' },
            { row: 2, col: 1 , title: 'PORT AUX. ENGINE', type: 'AE1' },
            { row: 2, col: 2 , title: '', type: '' },
            { row: 2, col: 3 , title: 'STARBOARD AUX. ENGINE', type: 'AE1' }
        ]
    };

    SC_BRAVE = { 
        prefix: 'A03-', 
        details:  [
            { row: 1, col: 1 , title: 'PORT MAIN ENGINE', type: 'ME1' },
            { row: 1, col: 2 , title: 'CENTER MAIN ENGINE', type: 'ME1' },
            { row: 1, col: 3 , title: 'STARBOARD MAIN ENGINE', type: 'ME1' },
            { row: 2, col: 1 , title: 'PORT AUX. ENGINE', type: 'AE1' },
            { row: 2, col: 2 , title: '', type: '' },
            { row: 2, col: 3 , title: 'STARBOARD AUX. ENGINE', type: 'AE1' }
        ]
    };

    SC_GLORY_7 = { 
        prefix: 'A04-', 
        details: [
            { row: 1, col: 1 , title: 'PORT MAIN ENGINE', type: 'ME1' },
            { row: 1, col: 2 , title: 'CENTER MAIN ENGINE', type: 'ME1' },
            { row: 1, col: 3 , title: 'STARBOARD MAIN ENGINE', type: 'ME1' },
            { row: 2, col: 1 , title: 'PORT AUX. ENGINE', type: 'AE1' },
            { row: 2, col: 2 , title: '', type: '' },
            { row: 2, col: 3 , title: 'STARBOARD AUX. ENGINE', type: 'AE1' }
        ]
    };

    SC_DUMMY = { 
        prefix: 'SC_DUMMY-', 
        details: [
            { row: 1, col: 1, title: 'PORT MAIN ENGINE', type: 'ME1' },
            { row: 1, col: 2, title: '', type: '' },
            { row: 1, col: 3, title: 'STARBOARD MAIN ENGINE', type: 'ME1' },
            { row: 2, col: 1, title: 'PORT AUX. ENGINE', type: 'AE1' },
            { row: 2, col: 2, title: 'CENTER AUX. ENGINE', type: 'AE1' },
            { row: 2, col: 3, title: 'STARBOARD AUX. ENGINE', type: 'AE1' }
        ]
    };

    SC_EMERALD = { 
        prefix: 'A05-', 
        details: [
            { row: 1, col: 1, title: 'PORT MAIN ENGINE', type: 'ME1' },
            { row: 1, col: 2, title: '', type: '' },
            { row: 1, col: 3, title: 'STARBOARD MAIN ENGINE', type: 'ME1' },
            { row: 2, col: 1, title: 'PORT AUX. ENGINE', type: 'AE1' },
            { row: 2, col: 2, title: 'CENTER AUX. ENGINE', type: 'AE1' },
            { row: 2, col: 3, title: 'STARBOARD AUX. ENGINE', type: 'AE1' }
        ]
    };

    SC_BONGKOT = { 
        prefix: 'A06-', 
        details: [
            { row: 1, col: 1, title: 'DIESEL GENERATOR 1', type: 'DG_RPM' },
            { row: 1, col: 2, title: 'PORT MOTOR', type: 'MOTOR' },
            { row: 1, col: 3, title: 'DIESEL GENERATOR 2', type: 'DG_RPM' },
            { row: 2, col: 1, title: 'DIESEL GENERATOR 3', type: 'DG_RPM' },
            { row: 2, col: 2, title: 'STARBOARD MOTOR', type: 'MOTOR' },
            { row: 2, col: 3, title: 'DIESEL GENERATOR 4', type: 'DG_RPM' },
        ]
    };

    SC_PAILIN = { 
        prefix: 'A07-', 
        details: [
            { row: 1, col: 1 , title: 'PORT MAIN ENGINE', type: 'ME1' },
            { row: 1, col: 2 , title: '', type: '' },
            { row: 1, col: 3 , title: 'STARBOARD MAIN ENGINE', type: 'ME1' },
            { row: 2, col: 1 , title: 'PORT AUX. ENGINE', type: 'AE1' },
            { row: 2, col: 2 , title: 'CENTER AUX. ENGINE', type: 'AE1' },
            { row: 2, col: 3 , title: 'STARBOARD AUX. ENGINE', type: 'AE1' }
        ]
    };

    SC_WINTER = { 
        prefix: 'A09-', 
        details: [
            { row: 1, col: 1 , title: 'DIESEL GENERATOR 1', type: 'DG_RPM' },
            { row: 1, col: 2 , title: 'PORT MOTOR', type: 'MOTOR' },
            { row: 1, col: 3 , title: 'DIESEL GENERATOR 2', type: 'DG_RPM' },
            { row: 2, col: 1 , title: 'DIESEL GENERATOR 3', type: 'DG_RPM' },
            { row: 2, col: 2 , title: 'STARBOARD MOTOR', type: 'MOTOR' },
            { row: 2, col: 3 , title: 'DIESEL GENERATOR 4', type: 'DG_RPM' },
        ]
    };

    SC_GLORY_1 = { 
        prefix: 'SC_GLORY1-', 
        details:  [
            { row: 1, col: 1 , title: 'PORT MAIN ENGINE', type: 'ME1' },
            { row: 1, col: 2 , title: 'CENTER MAIN ENGINE', type: 'ME1' },
            { row: 1, col: 3 , title: 'STARBOARD MAIN ENGINE', type: 'ME1' },
            { row: 2, col: 1 , title: 'PORT AUX. ENGINE', type: 'AE1' },
            { row: 2, col: 2 , title: '', type: '' },
            { row: 2, col: 3 , title: 'STARBOARD AUX. ENGINE', type: 'AE1' }
        ]
    };

    SC_GLORY_3 = { 
        prefix: 'SC_GLORY3-', 
        details:  [
            { row: 1, col: 1 , title: 'PORT MAIN ENGINE', type: 'ME1' },
            { row: 1, col: 2 , title: 'CENTER MAIN ENGINE', type: 'ME1' },
            { row: 1, col: 3 , title: 'STARBOARD MAIN ENGINE', type: 'ME1' },
            { row: 2, col: 1 , title: 'PORT AUX. ENGINE', type: 'AE1' },
            { row: 2, col: 2 , title: '', type: '' },
            { row: 2, col: 3 , title: 'STARBOARD AUX. ENGINE', type: 'AE1' }
        ]
    };

    SC_CHOLUEDEE = { 
        prefix: 'SC_CHOLUEDEE-', 
        details:  [
            { row: 1, col: 1 , title: 'PORT MAIN ENGINE', type: 'ME1' },
            { row: 1, col: 2 , title: '', type: '' },
            { row: 1, col: 3 , title: 'STARBOARD MAIN ENGINE', type: 'ME1' },
            { row: 2, col: 1 , title: 'PORT AUX. ENGINE', type: 'AE1' },
            { row: 2, col: 2 , title: '', type: '' },
            { row: 2, col: 3 , title: 'STARBOARD AUX. ENGINE', type: 'AE1' }
        ]
    };

    SC_SULTAN = { 
        prefix: 'SC_SULTAN-', 
        details: [
            { row: 1, col: 1, title: 'PORT MAIN ENGINE', type: 'ME1' },
            { row: 1, col: 2, title: '', type: '' },
            { row: 1, col: 3, title: 'STARBOARD MAIN ENGINE', type: 'ME1' },
            { row: 2, col: 1, title: 'PORT AUX. ENGINE', type: 'AE1' },
            { row: 2, col: 2, title: 'CENTER AUX. ENGINE', type: 'AE1' },
            { row: 2, col: 3, title: 'STARBOARD AUX. ENGINE', type: 'AE1' }
        ]
    };

    SC_RAJA = { 
        prefix: 'SC_RAJA-', 
        details: [
            { row: 1, col: 1, title: 'PORT MAIN ENGINE', type: 'ME1' },
            { row: 1, col: 2, title: '', type: '' },
            { row: 1, col: 3, title: 'STARBOARD MAIN ENGINE', type: 'ME1' },
            { row: 2, col: 1, title: 'PORT AUX. ENGINE', type: 'AE1' },
            { row: 2, col: 2, title: '', type: '' },
            { row: 2, col: 3, title: 'STARBOARD AUX. ENGINE', type: 'AE1' }
        ]
    };
    
    BB_MUKDA = { 
        prefix: 'BB_MUKDA', 
        details:  [
            { row: 1, col: 1 , title: 'DIESEL GENERATOR 1', type: 'DG_NO_RPM' },
            { row: 1, col: 2 , title: "DIESEL GENERATOR 2", type: "DG_NO_RPM" },
            { row: 1, col: 3 , title: "DIESEL GENERATOR 3", type: "DG_NO_RPM" },
            { row: 2, col: 1 , title: "DIESEL GENERATOR 4", type: "DG_NO_RPM" },
            { row: 2, col: 2 , title: "", type: "" },
            { row: 2, col: 3 , title: "", type: "" }
        ]
    };

    BB_BUSSARAKHAM = { 
        prefix: 'BB_BUSSARAKHAM', 
        details:  [
            { row: 1, col: 1 , title: 'DIESEL GENERATOR 1', type: 'DG_NO_RPM' },
            { row: 1, col: 2 , title: "DIESEL GENERATOR 2", type: "DG_NO_RPM" },
            { row: 1, col: 3 , title: "DIESEL GENERATOR 3", type: "DG_NO_RPM" },
            { row: 2, col: 1 , title: "DIESEL GENERATOR 4", type: "DG_NO_RPM" },
            { row: 2, col: 2 , title: "", type: "" },
            { row: 2, col: 3 , title: "", type: "" }
        ]
    };

    // BB_BUSSARAKHAM = { 
    //     prefix: 'BB_BUSSARAKHAM', 
    //     details:  [
    //         { row: 1, col: 1 , title: 'DIESEL GENERATOR 1', type: 'DG_NO_RPM_VTOTAL' },
    //         { row: 1, col: 2 , title: "DIESEL GENERATOR 2", type: "DG_NO_RPM_VTOTAL" },
    //         { row: 1, col: 3 , title: "DIESEL GENERATOR 3", type: "DG_NO_RPM_VTOTAL" },
    //         { row: 2, col: 1 , title: "DIESEL GENERATOR 4", type: "DG_NO_RPM_VTOTAL" },
    //         { row: 2, col: 2 , title: "", type: "" },
    //         { row: 2, col: 3 , title: "", type: "" }
    //     ]
    // };

    BB_MAKMUR = { 
        prefix: 'BB_MAKMUR', 
        details:  [
            // { row: 1, col: 1 , title: 'DIESEL GENERATOR 1', type: 'DG_NO_RPM_VTOTAL' },
            // { row: 1, col: 2 , title: "DIESEL GENERATOR 2", type: "DG_NO_RPM_VTOTAL" },
            // { row: 1, col: 3 , title: "DIESEL GENERATOR 3", type: "DG_NO_RPM_VTOTAL" },
            // { row: 2, col: 1 , title: "DIESEL GENERATOR 4", type: "DG_NO_RPM_VTOTAL" },
            // { row: 2, col: 2 , title: "", type: "" },
            // { row: 2, col: 3 , title: "", type: "" }
            { row: 1, col: 1 , title: 'DIESEL GENERATOR 1', type: 'DG_NO_RPM' },
            { row: 1, col: 2 , title: "DIESEL GENERATOR 2", type: "DG_NO_RPM" },
            { row: 1, col: 3 , title: "DIESEL GENERATOR 3", type: "DG_NO_RPM" },
            { row: 2, col: 1 , title: "DIESEL GENERATOR 4", type: "DG_NO_RPM" },
            { row: 2, col: 2 , title: "", type: "" },
            { row: 2, col: 3 , title: "", type: "" }
        ]
    };

    BB_GOMEN = { 
        prefix: 'BB_GOMEN', 
        details:  [
            { row: 1, col: 1 , title: 'DIESEL GENERATOR 1', type: 'DG_NO_RPM' },
            { row: 1, col: 2 , title: "DIESEL GENERATOR 2", type: "DG_NO_RPM" },
            { row: 1, col: 3 , title: "DIESEL GENERATOR 3", type: "DG_NO_RPM" },
            { row: 2, col: 1 , title: "DIESEL GENERATOR 4", type: "DG_NO_RPM" },
            { row: 2, col: 2 , title: "", type: "" },
            { row: 2, col: 3 , title: "", type: "" }
        ]
    };

    BB_MULIA = { 
        prefix: 'BB_MULIA', 
        details:  [
            { row: 1, col: 1 , title: 'DIESEL GENERATOR 1', type: 'DG_NO_RPM' },
            { row: 1, col: 2 , title: "DIESEL GENERATOR 2", type: "DG_NO_RPM" },
            { row: 1, col: 3 , title: "DIESEL GENERATOR 3", type: "DG_NO_RPM" },
            { row: 2, col: 1 , title: "DIESEL GENERATOR 4", type: "DG_NO_RPM" },
            { row: 2, col: 2 , title: "", type: "" },
            { row: 2, col: 3 , title: "", type: "" }
        ]
    };

    BB_KAIMOOK = { 
        prefix: 'BB_KAIMOOK', 
        details:  [
            { row: 1, col: 1 , title: 'DIESEL GENERATOR 1', type: 'DG_NO_RPM' },
            { row: 1, col: 2 , title: "DIESEL GENERATOR 2", type: "DG_NO_RPM" },
            { row: 1, col: 3 , title: "DIESEL GENERATOR 3", type: "DG_NO_RPM" },
            { row: 2, col: 1 , title: "DIESEL GENERATOR 4", type: "DG_NO_RPM" },
            { row: 2, col: 2 , title: "", type: "" },
            { row: 2, col: 3 , title: "", type: "" }
        ]
    };

    BB_INTAN = { 
        prefix: 'BB_INTAN', 
        details:  [
            // { row: 1, col: 1 , title: 'DIESEL GENERATOR 1', type: 'DG_NO_RPM_VTOTAL' },
            // { row: 1, col: 2 , title: "DIESEL GENERATOR 2", type: "DG_NO_RPM_VTOTAL" },
            // { row: 1, col: 3 , title: "DIESEL GENERATOR 3", type: "DG_NO_RPM_VTOTAL" },
            // { row: 2, col: 1 , title: "DIESEL GENERATOR 4", type: "DG_NO_RPM_VTOTAL" },
            // { row: 2, col: 2 , title: "", type: "" },
            // { row: 2, col: 3 , title: "", type: "" }
            { row: 1, col: 1 , title: 'DIESEL GENERATOR 1', type: 'DG_NO_RPM' },
            { row: 1, col: 2 , title: "DIESEL GENERATOR 2", type: "DG_NO_RPM" },
            { row: 1, col: 3 , title: "DIESEL GENERATOR 3", type: "DG_NO_RPM" },
            { row: 2, col: 1 , title: "DIESEL GENERATOR 4", type: "DG_NO_RPM_VTOTAL" },
            { row: 2, col: 2 , title: "", type: "" },
            { row: 2, col: 3 , title: "", type: "" }
        ]
    };

    
    BB_LIBERTY233 = { 
        prefix: 'BB_LIBERTY233', 
        details:  [
            { row: 1, col: 1 , title: 'DIESEL GENERATOR 1', type: 'DG_NO_RPM' },
            { row: 1, col: 2 , title: "DIESEL GENERATOR 2", type: "DG_NO_RPM" },
            { row: 1, col: 3 , title: "DIESEL GENERATOR 3", type: "DG_NO_RPM" },
            { row: 2, col: 1 , title: "DIESEL GENERATOR 4", type: "DG_NO_RPM" },
            { row: 2, col: 2 , title: "", type: "" },
            { row: 2, col: 3 , title: "", type: "" }
        ]
    };

    BB_TONGKAM = { 
        prefix: 'BB_TONGKAM', 
        details:  [
            // { row: 1, col: 1 , title: 'DIESEL GENERATOR 1', type: 'DG_NO_RPM_VTOTAL' },
            // { row: 1, col: 2 , title: "DIESEL GENERATOR 2", type: "DG_NO_RPM_VTOTAL" },
            // { row: 1, col: 3 , title: "DIESEL GENERATOR 3", type: "DG_NO_RPM_VTOTAL" },
            // { row: 2, col: 1 , title: "DIESEL GENERATOR 4", type: "DG_NO_RPM_VTOTAL" },
            // { row: 2, col: 2 , title: "", type: "" },
            // { row: 2, col: 3 , title: "", type: "" }
            { row: 1, col: 1 , title: 'DIESEL GENERATOR 1', type: 'DG_NO_RPM' },
            { row: 1, col: 2 , title: "DIESEL GENERATOR 2", type: "DG_NO_RPM" },
            { row: 1, col: 3 , title: "DIESEL GENERATOR 3", type: "DG_NO_RPM" },
            { row: 2, col: 1 , title: "DIESEL GENERATOR 4", type: "DG_NO_RPM_VTOTAL" },
            { row: 2, col: 2 , title: "", type: "" },
            { row: 2, col: 3 , title: "", type: "" }
        ]
    };

    BB_LAZURIT = { 
        prefix: 'BB_LAZURIT', 
        details:  [
            // { row: 1, col: 1 , title: 'DIESEL GENERATOR 1', type: 'DG_NO_RPM_VTOTAL' },
            // { row: 1, col: 2 , title: "DIESEL GENERATOR 2", type: "DG_NO_RPM_VTOTAL" },
            // { row: 1, col: 3 , title: "DIESEL GENERATOR 3", type: "DG_NO_RPM_VTOTAL" },
            // { row: 2, col: 1 , title: "DIESEL GENERATOR 4", type: "DG_NO_RPM_VTOTAL" },
            // { row: 2, col: 2 , title: "", type: "" },
            // { row: 2, col: 3 , title: "", type: "" }
            { row: 1, col: 1 , title: 'DIESEL GENERATOR 1', type: 'DG_NO_RPM' },
            { row: 1, col: 2 , title: "DIESEL GENERATOR 2", type: "DG_NO_RPM" },
            { row: 1, col: 3 , title: "DIESEL GENERATOR 3", type: "DG_NO_RPM" },
            { row: 2, col: 1 , title: "DIESEL GENERATOR 4", type: "DG_NO_RPM_VTOTAL" },
            { row: 2, col: 2 , title: "", type: "" },
            { row: 2, col: 3 , title: "", type: "" }
        ]
    };

    BB_TIARA = { 
        prefix: 'BB_TIARA', 
        details:  [
            { row: 1, col: 1 , title: 'DIESEL GENERATOR 1', type: 'DG_NO_RPM_VTOTAL' },
            { row: 1, col: 2 , title: "DIESEL GENERATOR 2", type: "DG_NO_RPM_VTOTAL" },
            { row: 1, col: 3 , title: "DIESEL GENERATOR 3", type: "DG_NO_RPM_VTOTAL" },
            { row: 2, col: 1 , title: "DIESEL GENERATOR 4", type: "DG_NO_RPM_VTOTAL" },
            { row: 2, col: 2 , title: "", type: "" },
            { row: 2, col: 3 , title: "", type: "" }
        ]
    };

    BB_PHET = { 
        prefix: 'BB_PHET', 
        details:  [
            { row: 1, col: 1 , title: 'DIESEL GENERATOR 1', type: 'DG_NO_RPM_VTOTAL' },
            { row: 1, col: 2 , title: "DIESEL GENERATOR 2", type: "DG_NO_RPM_VTOTAL" },
            { row: 1, col: 3 , title: "DIESEL GENERATOR 3", type: "DG_NO_RPM_VTOTAL" },
            { row: 2, col: 1 , title: "DIESEL GENERATOR 4", type: "DG_NO_RPM_VTOTAL" },
            { row: 2, col: 2 , title: "", type: "" },
            { row: 2, col: 3 , title: "", type: "" }
        ]
    };

    BB_JINDAMANEE = { 
        prefix: 'BB_JINDAMANEE', 
        details:  [
            // { row: 1, col: 1 , title: 'DIESEL GENERATOR 1', type: 'DG_NO_RPM_VTOTAL' },
            // { row: 1, col: 2 , title: "DIESEL GENERATOR 2", type: "DG_NO_RPM_VTOTAL" },
            // { row: 1, col: 3 , title: "DIESEL GENERATOR 3", type: "DG_NO_RPM_VTOTAL" },
            // { row: 2, col: 1 , title: "DIESEL GENERATOR 4", type: "DG_NO_RPM_VTOTAL" },
            // { row: 2, col: 2 , title: "", type: "" },
            // { row: 2, col: 3 , title: "", type: "" }
            { row: 1, col: 1 , title: 'DIESEL GENERATOR 1', type: 'DG_NO_RPM' },
            { row: 1, col: 2 , title: "DIESEL GENERATOR 2", type: "DG_NO_RPM" },
            { row: 1, col: 3 , title: "DIESEL GENERATOR 3", type: "DG_NO_RPM" },
            { row: 2, col: 1 , title: "DIESEL GENERATOR 4", type: "DG_NO_RPM_VTOTAL" },
            { row: 2, col: 2 , title: "", type: "" },
            { row: 2, col: 3 , title: "", type: "" }
        ]
    };

    BB_ZAMRUD = { 
        prefix: 'BB_ZAMRUD', 
        details:  [
            // { row: 1, col: 1 , title: 'DIESEL GENERATOR 1', type: 'DG_NO_RPM_VTOTAL' },
            // { row: 1, col: 2 , title: "DIESEL GENERATOR 2", type: "DG_NO_RPM_VTOTAL" },
            // { row: 1, col: 3 , title: "DIESEL GENERATOR 3", type: "DG_NO_RPM_VTOTAL" },
            // { row: 2, col: 1 , title: "DIESEL GENERATOR 4", type: "DG_NO_RPM_VTOTAL" },
            // { row: 2, col: 2 , title: "", type: "" },
            // { row: 2, col: 3 , title: "", type: "" }
            { row: 1, col: 1 , title: 'DIESEL GENERATOR 1', type: 'DG_NO_RPM' },
            { row: 1, col: 2 , title: "DIESEL GENERATOR 2", type: "DG_NO_RPM" },
            { row: 1, col: 3 , title: "DIESEL GENERATOR 3", type: "DG_NO_RPM" },
            { row: 2, col: 1 , title: "DIESEL GENERATOR 4", type: "DG_NO_RPM_VTOTAL" },
            { row: 2, col: 2 , title: "", type: "" },
            { row: 2, col: 3 , title: "", type: "" }
        ]
    };

    MV_GEMIA = { 
        prefix: 'MV_GEMIA', 
        details: [
            { row: 1, col: 1, title: 'PORT MAIN ENGINE', type: 'AE1' },
            { row: 1, col: 2, title: '', type: '' },
            { row: 1, col: 3, title: 'STARBOARD MAIN ENGINE', type: 'AE1' },
            { row: 2, col: 1, title: 'PORT AUX. ENGINE', type: 'AE1' },
            { row: 2, col: 2, title: 'THRUSTER AUX. ENGINE', type: 'AE1' },
            { row: 2, col: 3, title: 'STARBOARD AUX. ENGINE', type: 'AE1' }
        ]
    };
       
}