export interface TagGroup{
    status: boolean;
    display: string;
    tags: TagItems[];
    items: TagItems[]
}

export interface TagItems{
    name: string;
    status: boolean;
}

export interface ResponseTagsModel{
    TagID: number;
    Name: string;
    Address: string;
    Description: string;
    PointSource: string;
    Group: string;
    Unit: string;
    Scan: number;
    DataType: string;
    Alarm: number;
    Min: number;
    Max: number;
}

export interface RequestTagsModel{
    PointSource: string;
    DataType: string;
    Scan: string;
    Alarm: string;
    Group: string;
}

export interface TagsGroup{
    Group: string;
    Display: string;
    Status: boolean;
    SubGroup: SubGroup[];
    AliasItems: Items[];
}

export interface SubGroup{
    Display: string;
    Status: boolean;
    GroupItems: Items[];
}

export interface Items{
    Display: string;
    Status: boolean;
}

export interface GroupTags{
    name: string;
    status: boolean;
    equipments: Equipments[];
    parameters: Parameters[];
}

export interface Equipments{
    name: string;
    status: boolean;
    alias?: TagItems[];
}

export interface Parameters{
    name: string;
    status: boolean;
    type: string;
    alias?: ParameterItem[];
}

export interface TagsItem{
    name: string;
    status: boolean;
    type?: string;
}

export interface ParameterItem{
    name: string;
    status: boolean;
    type: string;
}

export interface TagsStateModel{
    name: string;
    tags: GroupTags[]
}

export interface TagRequestModel{
    pointsource: string;
    cal: number;
}