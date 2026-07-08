import {
    AfterViewInit,
    Component,
    ElementRef,
    EventEmitter,
    Input,
    NgZone,
    OnChanges,
    Output,
    SimpleChanges,
    ViewChild
} from '@angular/core';

import { PastTrackPoint } from '../../models/past-track.model';

declare var google: any;

interface UiMapPoint {
    point: PastTrackPoint;
    x: number;
    y: number;
}

@Component({
    selector: 'app-past-track-map',
    standalone: false,
    templateUrl: './past-track-map.component.html',
    styleUrls: ['./past-track-map.component.css']
})
export class PastTrackMapComponent implements AfterViewInit, OnChanges {

    @ViewChild('pastTrackMap') mapElement!: ElementRef<HTMLDivElement>;

    @Input() trackPoints: PastTrackPoint[] = [];
    @Input() selectedPoint: PastTrackPoint | null = null;

    @Output() pointSelected = new EventEmitter<PastTrackPoint>();

    map: any = null;
    polyline: any = null;
    markers: any[] = [];

    mapReady: boolean = false;
    mapError: string = '';
    useFallbackMap: boolean = false;

    uiMapPoints: UiMapPoint[] = [];
    uiRoutePoints: string = '';

    constructor(private zone: NgZone) {}

    ngAfterViewInit(): void {
        this.initMap();
        this.buildFallbackMap();
    }

    ngOnChanges(changes: SimpleChanges): void {
        this.buildFallbackMap();

        if (this.mapReady) {
            this.drawRoute();
        }
    }

    initMap(): void {
        if (typeof google === 'undefined' || !google.maps) {
            this.useFallbackMap = true;
            this.mapError = '';
            return;
        }

        if (!this.mapElement || !this.mapElement.nativeElement) {
            this.useFallbackMap = true;
            this.mapError = '';
            return;
        }

        var center = this.getInitialCenter();

        this.map = new google.maps.Map(this.mapElement.nativeElement, {
            center: center,
            zoom: 8,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            fullscreenControl: true,
            zoomControl: true,
            streetViewControl: false,
            mapTypeControl: true
        });

        this.mapReady = true;
        this.useFallbackMap = false;
        this.drawRoute();
    }

    drawRoute(): void {
        this.clearRoute();

        if (!this.map || !this.trackPoints || this.trackPoints.length === 0) {
            return;
        }

        var path: any[] = [];
        var bounds = new google.maps.LatLngBounds();

        for (var i = 0; i < this.trackPoints.length; i++) {
            var point = this.trackPoints[i];

            var latLng = {
                lat: Number(point.lat),
                lng: Number(point.lng)
            };

            path.push(latLng);
            bounds.extend(latLng);

            var marker = new google.maps.Marker({
                position: latLng,
                map: this.map,
                title: point.time,
                icon: this.getPointIcon(point),
                zIndex: this.isSelected(point) ? 100 : 20
            });

            this.bindMarkerClick(marker, point);
            this.markers.push(marker);
        }

        this.polyline = new google.maps.Polyline({
            path: path,
            geodesic: true,
            strokeColor: '#1769ff',
            strokeOpacity: 1,
            strokeWeight: 4,
            map: this.map
        });

        if (path.length > 1) {
            this.map.fitBounds(bounds);
        } else {
            this.map.setCenter(path[0]);
            this.map.setZoom(10);
        }
    }

    bindMarkerClick(marker: any, point: PastTrackPoint): void {
        marker.addListener('click', () => {
            this.zone.run(() => {
                this.pointSelected.emit(point);
            });
        });
    }

    clearRoute(): void {
        if (this.polyline) {
            this.polyline.setMap(null);
            this.polyline = null;
        }

        for (var i = 0; i < this.markers.length; i++) {
            if (this.markers[i]) {
                this.markers[i].setMap(null);
            }
        }

        this.markers = [];
    }

    getInitialCenter(): any {
        if (this.trackPoints && this.trackPoints.length > 0) {
            return {
                lat: Number(this.trackPoints[0].lat),
                lng: Number(this.trackPoints[0].lng)
            };
        }

        return {
            lat: 9.5,
            lng: 101
        };
    }

    getPointIcon(point: PastTrackPoint): any {
        var selected = this.isSelected(point);
        var color = '#10b981';

        if (point.status === 'Idle') {
            color = '#f59e0b';
        }

        if (point.status === 'No Data') {
            color = '#94a3b8';
        }

        if (selected) {
            color = '#1769ff';
        }

        var size = selected ? 42 : 34;
        var radius = selected ? 18 : 15;
        var center = size / 2;

        var svg =
            '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" xmlns="http://www.w3.org/2000/svg">' +
                '<circle cx="' + center + '" cy="' + center + '" r="' + radius + '" fill="white" stroke="' + color + '" stroke-width="4"/>' +
                '<text x="' + center + '" y="' + (center + 5) + '" text-anchor="middle" font-family="Arial" font-size="13" font-weight="800" fill="' + color + '">' + point.no + '</text>' +
            '</svg>';

        return {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
            scaledSize: new google.maps.Size(size, size),
            anchor: new google.maps.Point(center, center)
        };
    }

    selectFallbackPoint(point: PastTrackPoint): void {
        this.pointSelected.emit(point);
    }

    buildFallbackMap(): void {
        this.uiMapPoints = [];
        this.uiRoutePoints = '';

        if (!this.trackPoints || this.trackPoints.length === 0) {
            return;
        }

        var lats = this.trackPoints.map(p => p.lat);
        var lngs = this.trackPoints.map(p => p.lng);

        var minLat = Math.min.apply(null, lats);
        var maxLat = Math.max.apply(null, lats);
        var minLng = Math.min.apply(null, lngs);
        var maxLng = Math.max.apply(null, lngs);

        var latRange = maxLat - minLat;
        var lngRange = maxLng - minLng;

        if (latRange === 0) {
            latRange = 1;
        }

        if (lngRange === 0) {
            lngRange = 1;
        }

        for (var i = 0; i < this.trackPoints.length; i++) {
            var point = this.trackPoints[i];

            var x = 16 + ((point.lng - minLng) / lngRange) * 70;
            var y = 76 - ((point.lat - minLat) / latRange) * 56;

            this.uiMapPoints.push({
                point: point,
                x: x,
                y: y
            });
        }

        this.uiRoutePoints = this.uiMapPoints
            .map(mp => mp.x + ',' + mp.y)
            .join(' ');
    }

    isSelected(point: PastTrackPoint): boolean {
        return !!this.selectedPoint && !!point && this.selectedPoint.no === point.no;
    }

    getFallbackPointClass(point: PastTrackPoint): any {
        return {
            selected: this.isSelected(point),
            idle: point.status === 'Idle',
            nodata: point.status === 'No Data'
        };
    }

    formatLat(lat: number): string {
        return Math.abs(Number(lat) || 0).toFixed(5) + (Number(lat) >= 0 ? ' N' : ' S');
    }

    formatLng(lng: number): string {
        return Math.abs(Number(lng) || 0).toFixed(5) + (Number(lng) >= 0 ? ' E' : ' W');
    }
}
