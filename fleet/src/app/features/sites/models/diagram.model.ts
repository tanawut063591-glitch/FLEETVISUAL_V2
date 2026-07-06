export interface DiagramConfigModel{
    name: string;
    title: string;
    textBinding: TextMapper[];
    colorBinding: ColorMapper[];
}

export interface TextMapper{
    value: string | number | boolean;
    message: string;
    tag?: string;
}

export interface ColorMapper{
    value: string | number | boolean;
    color: string;
    tag?: string;
}