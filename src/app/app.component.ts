import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { IndexedDBService } from './services/indexed-db.service';
import Swal from 'sweetalert2';
import { GeneralParameterService } from '../generic/general.service';
import * as pdfjsLib from 'pdfjs-dist';


@Component({
  selector: 'app-root',

  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  url = "";
  public isPrinting = false;  // Flag to track if printing is in progress



  frmImpresion : FormGroup;
  password = "drago123"
  access  = false;


  title = "Aplicación para la escucha e impresión de comandos de SIGEC: Una herramienta diseñada para recibir, procesar, y registrar comandos del sistema SIGEC, permitiendo su impresión eficiente y seguimiento en tiempo real.";

  constructor(
    private indexedDBService: IndexedDBService,
    private service: GeneralParameterService
  ) {

    this.frmImpresion = new FormGroup({
      Api: new FormControl("", [Validators.required]),
    });

    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js';  // CDN version

  }

  async ngOnInit(): Promise<void> {
    const api = await this.db();
    this.service.url = api.api;
    if (api) {
      setInterval(() => {
        if (!this.isPrinting) {
          this.startPolling();
        }
      }, 2000);
    }
  }

  async db(): Promise<any> {
    try {
      const data = await this.indexedDBService.getData();  // Usamos await para esperar los datos
      if (data.length > 0) {
        this.url =data[0];
        return data[0];  // Retorna el primer item
      } else {
        return null;  // Retornamos null si no hay datos
      }
    } catch (error) {
      return null;  // También retornamos null si ocurre un error
    }
  }


  //alamcenar valor de la api
  Almacenar() {
    const apiValue = this.frmImpresion.get('Api')?.value;
    this.indexedDBService.storeData({ api: apiValue });
    this.access = false;
    this.frmImpresion.reset();
  }

  settings(): void {
    Swal.fire({
      title: 'Configuración a la app',
      text: 'Ingrese la clave del admiistrador para poder cambiar  los parametros del sitema',
      input: 'password',
      inputPlaceholder: 'Contraseña de acceso',
      showCancelButton: true,
      confirmButtonText: 'Enviar',
      cancelButtonText: 'Cancelar',


    }).then((result) => {
      if (result.isConfirmed) {
        const inputValue = result.value;

        if(inputValue == this.password){
          this.access= true;
          Swal.fire('¡Acceso Concedido!', `Bienvenido al sistema. Disfrute de su sesión.`, 'success');
        }else{
          Swal.fire('Acceso Denegado', 'Las credenciales ingresadas no son válidas. Por favor, intente de nuevo.!', 'error');
        }
      }
    }).catch((error) => {
    });
  }

  async startPolling(): Promise<void> {


    if (this.isPrinting) {
      return;  // Do not make the request if printing is in progress
    }


    this.service.GetByComandaImpresion("Archivo").subscribe(
      async (response: any) => {

        // Verifica si el status es true y si hay datos
        if (response.status && Array.isArray(response.data)) {
          this.isPrinting = true;
          // Itera sobre cada elemento en el arreglo data
          for (const item of response.data) {
            // Verifica que el contenido PDF exista
            if (item.content) {
              try {
                // Espera a que se complete la impresión antes de continuar con la siguiente
                await this.printCommand(item.content, item);
              } catch (error) {
              }
            }
          }
        } else {
        }
      },
      (error) => {
      },
      () => {
        this.isPrinting = false;  // Reset the flag when done
      }
    );
  }



  async printCommand(content: string, data: any): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      // Verificar si el navegador soporta impresión directa
      if (!window.print) {
        reject("Impresión no soportada");
        return;
      }

      try {
        // Convierte el PDF a imagen en base64
        const imgAbase64 = await this.convertPdfToImage(content);

        const cargaUtil = {
          serial: "",
          nombreImpresora: "SAT15TUS",
          operaciones: [
            {
              nombre: "ImprimirImagenEnBase64",
              argumentos: [
                imgAbase64[0], // Primera imagen en base64
                350, // Ancho de la imagen
                0,   // Posición X
                false // Indicador de impresión
              ]
            }
          ]
        };

        // Enviar solicitud HTTP para imprimir
        const respuestaHttp = await fetch("http://localhost:8000/imprimir", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cargaUtil),
        });

        const respuesta = await respuestaHttp.json();
        if (respuestaHttp.ok) {
          // Al completar la impresión, actualizar la comanda
          await this.updateComanda(data);
          resolve(); // Resolucion de la promesa
        } else {
          reject("Error en el plugin de impresión");
        }
      } catch (e) {
        console.error("Error en la operación de impresión:", e);
        reject("Error en la operación de impresión");
      }
    });
  }

  async convertPdfToImage(base64Pdf: string): Promise<string[]> {
    const pdfData = this.base64ToUint8Array(base64Pdf);

    const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
    const imagesBase64: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 5.0 }); // Ajusta la escala según sea necesario

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) continue;

      // Ajustar el ancho y la altura del lienzo
      canvas.width = viewport.width;
      canvas.height = viewport.height * 0.2; // Reducir la altura al 50%

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      // Renderizar la página completa en el lienzo
      await page.render(renderContext).promise;

      const imgBase64 = canvas.toDataURL('image/png');
      imagesBase64.push(imgBase64);
    }

    return imagesBase64;
  }



  private base64ToUint8Array(base64: string): Uint8Array {
    const raw = atob(base64);
    const uint8Array = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) {
      uint8Array[i] = raw.charCodeAt(i);
    }
    return uint8Array;
  }

  updateComanda(datas: any) {
    // Modificar el valor de 'impreso' dentro del objeto 'datas'
    const updatedData = {
      ...datas,          // Mantener el resto de las propiedades de 'datas'
      impreso: true      // Actualizar la propiedad 'impreso' a 'true'
    };

    this.service.save("Archivo", updatedData.id, updatedData).subscribe(
      (response) => {
      },
      (error) => {
        console.error('Error al actualizar la comanda:', error);
      }
    );
  }


}

