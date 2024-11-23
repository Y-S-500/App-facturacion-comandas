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
 // Opens the database, creating it if it doesn't exist, and upgrades the version if needed.
openDatabase(): void {
  const request = indexedDB.open(this.dbName, 2); // Increment version to trigger upgrade if needed

  request.onupgradeneeded = (event: any) => {
    const db = event.target.result;

    // Check if the object store exists, if not, create it
    if (!db.objectStoreNames.contains(this.storeName)) {
      const objectStore = db.createObjectStore(this.storeName, { keyPath: 'id', autoIncrement: true });
      objectStore.createIndex('api', 'api', { unique: false });
      objectStore.createIndex('print', 'print', { unique: false });
    }
  };

  request.onerror = (event: any) => {
    console.error('Error opening database:', event.target.error);
    Swal.fire('Error', 'No se pudo abrir la base de datos.', 'error');
  };

  request.onsuccess = (event: any) => {
    console.log('Database opened successfully:', event.target.result);
  };
}

// Store data in the IndexedDB
storeData(data: any): void {
  const request = indexedDB.open(this.dbName, 2); // Ensure we are using the same version

  request.onupgradeneeded = (event: any) => {
    const db = event.target.result;

    // Create the object store if it doesn't already exist
    if (!db.objectStoreNames.contains(this.storeName)) {
      const objectStore = db.createObjectStore(this.storeName, { keyPath: 'id', autoIncrement: true });
      objectStore.createIndex('api', 'api', { unique: false });
      objectStore.createIndex('print', 'print', { unique: false });
    }
  };

  request.onsuccess = (event: any) => {
    const db = event.target.result;

    // Start a transaction and get the object store
    const transaction = db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);

    // Add the data to the store
    const addRequest = store.add(data);

    addRequest.onsuccess = () => {
      Swal.fire('¡Datos Almacenados!', 'Los datos han sido almacenados correctamente.', 'success');
    };

    addRequest.onerror = (errEvent: any) => {
      console.error('Error storing data:', errEvent.target.error);
      Swal.fire('Error', 'Ocurrió un error al almacenar los datos.', 'error');
    };

    transaction.onerror = (transactionEvent: any) => {
      console.error('Transaction failed:', transactionEvent.target.error);
    };
  };

  request.onerror = (event: any) => {
    console.error('Error opening database:', event.target.error);
    Swal.fire('Error', 'No se pudo abrir la base de datos.', 'error');
  };
}


  getData(): Promise<any[]> {
    const request = indexedDB.open(this.dbName, 2);
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

  deleteAllData(): Promise<void> {
    const request = indexedDB.open(this.dbName, 2); // Open the database (version 2)
    return new Promise<void>((resolve, reject) => {
      request.onsuccess = (event: Event) => {
        const db = (event.target as IDBRequest).result; // Casting to get the database
        const transaction = db.transaction([this.storeName], 'readwrite'); // Start a readwrite transaction
        const store = transaction.objectStore(this.storeName); // Get the object store

        // Clear all records from the object store
        const clearRequest = store.clear();

        clearRequest.onsuccess = () => {
          console.log('All data has been deleted');
          resolve(); // Data cleared successfully
        };

        clearRequest.onerror = (event: Event) => {
          console.error('Error clearing data:', (event.target as IDBRequest).error);
          reject('Error clearing data');
        };

        transaction.onerror = (event: Event) => {
          console.error('Transaction failed:', (event.target as IDBTransaction).error);
          reject('Transaction failed');
        };
      };

      request.onerror = (event: Event) => {
        console.error('Error opening the database:', (event.target as IDBRequest).error);
        reject('Error opening the database');
      };
    });
  }

}
