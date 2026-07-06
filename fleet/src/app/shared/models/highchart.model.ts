import { ChartOptions, LegendOptions, PlotOptions, ResponsiveOptions, SeriesAreaOptions, SeriesColumnOptions, SeriesLineOptions, SeriesOptions, SeriesOptionsType, TitleOptions, TooltipOptions, XAxisOptions, YAxisOptions } from "highcharts";

export interface ChartOptionConfigs{
    chart: ChartOptions;
    title: TitleOptions;
    xAxis: XAxisOptions | XAxisOptions[];
    yAxis: YAxisOptions | YAxisOptions[];
    legend: LegendOptions;
    plotOptions: PlotOptions;
}

export interface ChartParameters{
    chart?: ChartOptions;
    title?: TitleOptions;
    xAxis?: XAxisOptions | undefined;
    yAxis?: YAxisOptions[];
    legend?: LegendOptions;
    plotOptions?: PlotOptions;
    tooltip?: TooltipOptions; 
    series?: SeriesOptionsType[] | SeriesLineOptions[] | SeriesAreaOptions[] | SeriesColumnOptions[];
    responsive?: ResponsiveOptions;
}

export interface ChartSettingOptions{
    [name: string]: ChartParameters;
}

export interface NgxDatas{
    name: string;
    series: NgxSeries[];
}

export interface NgxSeries{
    name: string | number;
    value: string | number;
}