import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, input } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GeneralParameterService {

   url = "";
  private header = new HttpHeaders();

  constructor(private http: HttpClient) {
    this.header.set("Content-Type", "application/json");
  }

  public setUrl(url: string): void {
    this.url = url;
    console.log(`URL set to: ${this.url}`);
  }
  public GetByComandaImpresion(ruta: String): Observable<any> {
    return this.http.get<any>(`${this.url}${ruta}/GetByComandaImpresion`, { headers: this.header });
  }

  public save(ruta: String, id: any, data: any): Observable<any> {
    if (id) {
      return this.http.put<any>(`${this.url}${ruta}`, data, { headers: this.header });
    }
    return this.http.post<any>(`${this.url}${ruta}`, data, { headers: this.header });
  }

}
