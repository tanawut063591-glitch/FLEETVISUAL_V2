import { UrlSerializer, UrlTree, DefaultUrlSerializer } from '@angular/router';

export class CustomUrlSerializer implements UrlSerializer {
  private dus = new DefaultUrlSerializer();

  parse(url: string): UrlTree {
    try {
      // Decode the URL first
      const decodedUrl = this.decodeUrl(url);
      return this.dus.parse(decodedUrl);
    } catch (e) {
      // If decoding fails, try parsing the original URL
      return this.dus.parse(url);
    }
  }

  serialize(tree: UrlTree): string {
    const normalUrl = this.dus.serialize(tree);
    // Don't encode the hash symbol or empty URLs
    if (!normalUrl || normalUrl === '/' || normalUrl === '') {
      return normalUrl;
    }
    return this.encodeUrl(normalUrl);
  }

  private encodeUrl(url: string): string {
    try {
      // Use encodeURIComponent for better Unicode support
      return btoa(encodeURIComponent(url));
    } catch (e) {
      return url;
    }
  }

  private decodeUrl(url: string): string {
    try {
      return decodeURIComponent(atob(url));
    } catch (e) {
      return url;
    }
  }
}