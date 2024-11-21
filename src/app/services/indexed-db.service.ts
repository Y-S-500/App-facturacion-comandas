import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class IndexedDBService {

  private dbName = 'myDatabase'; // Nombre de la base de datos
  private storeName = 'myStore'; // Nombre del almacén

  constructor() {
    this.openDatabase();
  }

  // Abre la base de datos o la crea si no existe
  openDatabase() {
    const request = indexedDB.open(this.dbName, 1);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(this.storeName)) {
        db.createObjectStore(this.storeName, { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onerror = (event: any) => {
      console.error('Error opening database:', event);
    };

    request.onsuccess = (event: any) => {
      console.log('Database opened successfully:', event.target.result);
    };
  }

  // Almacena datos en IndexedDB
  storeData(data: any) {
    const request = indexedDB.open(this.dbName, 1);

    request.onsuccess = (event: any) => {
      const db = event.target.result;
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      store.add(data);

      transaction.oncomplete = () => {
        Swal.fire('¡Datos Almacenados!', `Los datos han sido almacenados correctamente.`, 'success');

      };

      transaction.onerror = (event: any) => {
        console.error('Error storing data:', event);
      };
    };
  }

  getData(): Promise<any[]> {
    const request = indexedDB.open(this.dbName, 1);
    return new Promise<any[]>((resolve, reject) => {
      request.onsuccess = (event: Event) => {
        const db = (event.target as IDBRequest).result; // Casting para obtener la base de datos
        const transaction = db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const allData = store.getAll();

        allData.onsuccess = (event: Event) => {
          resolve((event.target as IDBRequest).result); // Casting para obtener los datos
        };

        allData.onerror = (event: Event) => {
          reject('Error retrieving data');
        };
      };

      request.onerror = (event: Event) => {
        reject('Error opening the database');
      };
    });
  }

}
