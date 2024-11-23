import { DataSelectDto } from './../generic/dataSelectDto';
import { Component, signal } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { IndexedDBService } from './services/indexed-db.service';
import Swal from 'sweetalert2';
import { GeneralParameterService } from '../generic/general.service';
import * as pdfjsLib from 'pdfjs-dist';
import {img}  from '../generic/dataProve' ;


@Component({
  selector: 'app-root',

  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  url = "";
  isPrinting = false;
  listPrinters =signal<DataSelectDto[]>([]);
  frmImpresion : FormGroup;
  password = "drago123"
  access  = false;
  namePrint = "";
  existDataDb = false;
  dataStart = img;
  isChecked: boolean = false;



  title = "Aplicación para la escucha e impresión de comandos de SIGEC: Una herramienta diseñada para recibir, procesar, y registrar comandos del sistema SIGEC, permitiendo su impresión eficiente y seguimiento en tiempo real.";

  constructor(
    private indexedDBService: IndexedDBService,
    private service: GeneralParameterService
  ) {

    this.frmImpresion = new FormGroup({
      Api: new FormControl("", [Validators.required]),
      Print:new FormControl("", [Validators.required]),
    });

    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js';  // CDN version

  }

  async ngOnInit(): Promise<void> {
    this.listPrints();

    const api = await this.db();
    if (api.length > 0) {
      this.existDataDb = true;
      this.service.url = api[0].api;
      this.namePrint = api[0].print;
      this.frmImpresion.get('Api')?.setValue(api[0].api);
      this.frmImpresion.get('Print')?.setValue(api[0].print);
    }
    this.printCommand(this.dataStart[0],true);


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
        return data;
      } else {
        return null;
      }
    } catch (error) {
      return null;  // También retornamos null si ocurre un error
    }
  }

  //alamcenar valor de la api
  Almacenar(): void {
    const apiValue = this.frmImpresion.get('Api')?.value;
    const printValue = this.frmImpresion.get('Print')?.value;

    if (apiValue && printValue) {
      this.indexedDBService.deleteAllData();
      this.indexedDBService.storeData({ api: apiValue, print: printValue });
      this.access = false;
      this.frmImpresion.reset();
    } else {
      Swal.fire('Campos Vacíos', 'Por favor complete todos los campos.', 'warning');
    }
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

  async deleteAllData(){
    this.indexedDBService.deleteAllData();
      this.frmImpresion.get('Api')?.setValue("");
      this.frmImpresion.get('Print')?.setValue("");
      this.existDataDb = false;
  }

  async startPolling(): Promise<void> {

    if (this.isPrinting) {
      return;
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
                await this.printCommand(item.content,false, response.data);
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


  async printCommand(content: string, pdfOrImg: boolean, data?: any): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      // Verificar si el navegador soporta impresión directa
      if (!window.print) {
        reject("Impresión no soportada");
        this.isChecked = false;
        Swal.fire('Empresa Desconectada', 'Por favor, verifique si la empresa está conectada correctamente.', 'warning');
        return;
      }

      try {
        let imgAbase64: any;

        if (!pdfOrImg) {
          imgAbase64 = await this.convertPdfToImage(content);
        } else {
          imgAbase64 = content;
        }

        const cargaUtil = {
          serial: "",
          nombreImpresora: "",
          operaciones: [
            {
              nombre: "ImprimirImagenEnBase64",
              argumentos: pdfOrImg
                ? [imgAbase64, 350, 0, false]
                : [imgAbase64[0], 350, 0, false],
            },
          ],
        };

        // Extraer y limpiar los nombres de impresoras
        const impresoras: string[] = Array.isArray(data)
          ? data.flatMap((item: any) =>
              item.impresoras?.split(",").map((i: string) => i.trim()) || [])
          : [];

        if (impresoras.length === 0) {
          reject("No se encontraron impresoras válidas en los datos proporcionados.");
          return;
        }

        // Realizar múltiples peticiones con diferentes nombres de impresoras
        for (const impresora of impresoras) {
          cargaUtil.nombreImpresora = impresora; // Asignar el nombre de la impresora

          const respuestaHttp = await fetch("http://localhost:8000/imprimir", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(cargaUtil),
          });

          const respuesta = await respuestaHttp.json();
          if (respuestaHttp.ok) {
            // Actualizar comanda o manejar éxito
            if (!pdfOrImg) {
              await this.updateComanda(data);
            } else {
              this.isChecked = true;
            }
          } else {
            this.isChecked = false;
            reject(`Error al imprimir con la impresora ${impresora}`);
            return; // Salir si hay un error
          }
        }

        resolve(); // Resolución de la promesa si todas las impresiones son exitosas
      } catch (e) {
        this.isChecked = false;
        console.error("Error en la operación de impresión:", e);
        reject("Error en la operación de impresión");
      }
    });
  }

  listPrints() {
    return new Promise<void>(async (resolve, reject) => {
      try {
        const respuestaHttp = await fetch("http://localhost:8000/impresoras", {
          method: "GET",
        });
        if (!respuestaHttp.ok) {
          reject("Error al obtener la lista de impresoras");
          return;
        }
        const respuesta = await respuestaHttp.json();
        if (respuesta != null) {
          this.listPrinters.set(respuesta);
          this.isChecked = true;
          resolve();
        } else {
          this.isChecked = false;
          reject("No hay impresoras disponibles en el plugin de impresión");
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

      // Escalar para calidad
      const viewport = page.getViewport({ scale: 5.0 });

      // Crear un lienzo para renderizar
      const tempCanvas = document.createElement('canvas');
      const tempContext = tempCanvas.getContext('2d');

      if (!tempContext) {
        console.error('No se pudo obtener el contexto 2D para el lienzo temporal.');
        continue;
      }

      tempCanvas.width = viewport.width;
      tempCanvas.height = viewport.height;

      await page.render({ canvasContext: tempContext, viewport: viewport }).promise;

      // Determinar la altura real del contenido
      const imageData = tempContext.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      const trimmedHeight = this.calculateContentHeight(imageData);

      // Crear el lienzo final con la altura ajustada
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      if (!context) {
        console.error('No se pudo obtener el contexto 2D para el lienzo final.');
        continue;
      }

      canvas.width = viewport.width;
      canvas.height = trimmedHeight;

      // Renderizar la página ajustada en el lienzo final
      await page.render({ canvasContext: context, viewport: viewport }).promise;

      // Convertir el lienzo a Base64
      const imgBase64 = canvas.toDataURL('image/png');
      imagesBase64.push(imgBase64);
    }

    return imagesBase64;
  }

  // Función auxiliar para calcular la altura del contenido real
  private calculateContentHeight(imageData: ImageData): number {
    const { data, height, width } = imageData;
    let contentHeight = 0;

    for (let y = height - 1; y >= 0; y--) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4; // Cada píxel tiene 4 valores RGBA
        if (data[index] !== 255 || data[index + 1] !== 255 || data[index + 2] !== 255) {
          contentHeight = y + 1; // Guardar la posición donde termina el contenido
          break;
        }
      }
      if (contentHeight > 0) break;
    }

    return contentHeight;
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

    const comandaData = datas[0];

    const updatedData = {
      ...comandaData,
      impresoras: "",
      impreso: true
    };

    // Llamar al servicio para guardar los cambios
    this.service.save("Archivo", updatedData.id, updatedData).subscribe(
      (response) => {
      },
      (error) => {
        console.error('Error al actualizar la comanda:', error);
      }
    );
  }



}

