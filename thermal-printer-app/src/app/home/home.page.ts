import { Component, OnInit, NgZone } from '@angular/core';
import { Platform, AlertController, ToastController } from '@ionic/angular/standalone';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardHeader,
  IonCardTitle, IonCardContent, IonList, IonItem, IonLabel, IonSelect,
  IonSelectOption, IonButton, IonInput, IonListHeader
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

declare let ThermalPrinter: any;
declare let BluetoothSerial: any;
declare let cordova: any;

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonButton,
    IonInput,
    IonListHeader
  ],
})
export class HomePage implements OnInit {
  currentDate = new Date();
  printerType = 'bluetooth';
  bluetoothDevices: any[] = [];
  selectedPrinter: any = null;
  printerIP = '192.168.1.100';
  printerPort = 9100;
  messages: { text: string, isError: boolean }[] = [];

  constructor(
    private platform: Platform,
    private alertController: AlertController,
    private toastController: ToastController,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    this.platform.ready().then(() => {
      this.addMessage('App ready. Select a printer to continue.', false);
    });
  }

  addMessage(text: string, isError: boolean = false) {
    this.ngZone.run(() => {
      this.messages.unshift({ text, isError });
      if (this.messages.length > 10) {
        this.messages.pop();
      }
    });
  }

  async listBluetoothDevices() {
    if (!this.platform.is('android') && !this.platform.is('ios')) {
      this.addMessage('Bluetooth functionality is only available on real devices', true);
      return;
    }

    try {
      if (this.platform.is('android')) {
        // Android method using ThermalPrinter plugin
        if (typeof ThermalPrinter !== 'undefined') {
          // Request Bluetooth permissions first
          await new Promise<void>((resolve, reject) => {
            ThermalPrinter.requestBTPermissions(
              { type: 'bluetooth' },
              () => resolve(),
              (err: any) => reject(err)
            );
          });

          // List BT printers
          await new Promise<void>((resolve, reject) => {
            ThermalPrinter.listPrinters(
              { type: 'bluetooth' },
              (printers: any[]) => {
                this.bluetoothDevices = printers;
                this.addMessage(`Found ${printers.length} Bluetooth devices`, false);
                resolve();
              },
              (err: any) => {
                this.addMessage('Error listing BT printers: ' + JSON.stringify(err), true);
                reject(err);
              }
            );
          });
        } else {
          // Fallback to BluetoothSerial
          await this.listBluetoothDevicesWithSerial();
        }
      } else if (this.platform.is('ios')) {
        // iOS method using BluetoothSerial
        await this.listBluetoothDevicesWithSerial();
      }
    } catch (error) {
      this.addMessage('Error: ' + JSON.stringify(error), true);
    }
  }

  async listBluetoothDevicesWithSerial() {
    if (typeof BluetoothSerial === 'undefined') {
      this.addMessage('BluetoothSerial plugin is not available', true);
      return;
    }

    try {
      // Check if Bluetooth is enabled
      const isEnabled = await new Promise<boolean>((resolve, reject) => {
        BluetoothSerial.isEnabled(
          () => resolve(true),
          () => resolve(false)
        );
      });

      if (!isEnabled) {
        const alert = await this.alertController.create({
          header: 'Bluetooth Disabled',
          message: 'Please enable Bluetooth to continue',
          buttons: ['OK']
        });
        await alert.present();
        return;
      }

      // List paired devices
      const devices = await new Promise<any[]>((resolve, reject) => {
        BluetoothSerial.list(
          (devices: any[]) => resolve(devices),
          (err: any) => reject(err)
        );
      });

      this.bluetoothDevices = devices;
      this.addMessage(`Found ${devices.length} paired Bluetooth devices`, false);
    } catch (error) {
      this.addMessage('Error listing Bluetooth devices: ' + JSON.stringify(error), true);
    }
  }

  async printTestPage() {
    try {
      if (this.printerType === 'bluetooth') {
        if (!this.selectedPrinter) {
          this.addMessage('Please select a Bluetooth printer first', true);
          return;
        }

        await this.printTestPageBluetooth();
      } else if (this.printerType === 'usb') {
        await this.printTestPageUSB();
      } else if (this.printerType === 'network') {
        await this.printTestPageNetwork();
      }
    } catch (error) {
      this.addMessage('Print error: ' + JSON.stringify(error), true);
    }
  }

  async printTestPageBluetooth() {
    if (typeof ThermalPrinter !== 'undefined' && this.platform.is('android')) {
      // Android using ThermalPrinter plugin
      await new Promise<void>((resolve, reject) => {
        const testText =
          "[C]<u><font size='big'>TEST PAGE</font></u>\n" +
          "[C]Thermal Printer Demo\n" +
          "[L]Date: " + new Date().toLocaleString() + "\n" +
          "[C]<barcode>12345678</barcode>\n" +
          "[C]<qrcode size='20'>https://example.com</qrcode>\n" +
          "[C]End of test\n";

        ThermalPrinter.printFormattedText(
          {
            type: 'bluetooth',
            id: this.selectedPrinter.id,
            text: testText
          },
          () => {
            this.addMessage('Test page printed successfully!', false);
            resolve();
          },
          (err: any) => {
            this.addMessage('Print failed: ' + JSON.stringify(err), true);
            reject(err);
          }
        );
      });
    } else if (typeof BluetoothSerial !== 'undefined') {
      // Using BluetoothSerial plugin (iOS or fallback)
      try {
        await new Promise<void>((resolve, reject) => {
          BluetoothSerial.connect(
            this.selectedPrinter.id,
            () => {
              // Connection successful
              // Send ESC/POS commands for test page
              const testData =
                '\x1B@' +        // Initialize printer
                '\x1B\x61\x01' + // Center align
                '\x1B\x21\x30' + // Large bold text
                'TEST PAGE\n' +
                '\x1B\x21\x00' + // Normal text
                'Thermal Printer Demo\n' +
                'Date: ' + new Date().toLocaleString() + '\n\n' +
                'End of test\n\n\n\n' +
                '\x1B\x64\x03'; // Feed paper and cut

              BluetoothSerial.write(
                testData,
                () => {
                  BluetoothSerial.disconnect();
                  this.addMessage('Test page printed successfully!', false);
                  resolve();
                },
                (err: any) => {
                  BluetoothSerial.disconnect();
                  reject(err);
                }
              );
            },
            (err: any) => reject(err)
          );
        });
      } catch (error) {
        this.addMessage('Bluetooth print error: ' + JSON.stringify(error), true);
      }
    } else {
      this.addMessage('Bluetooth printing not available on this platform', true);
    }
  }

  async printTestPageUSB() {
    if (typeof ThermalPrinter === 'undefined' || !this.platform.is('android')) {
      this.addMessage('USB printing is only available on Android', true);
      return;
    }

    try {
      // List USB printers
      const printers = await new Promise<any[]>((resolve, reject) => {
        ThermalPrinter.listPrinters(
          { type: 'usb' },
          (printers: any[]) => resolve(printers),
          (err: any) => reject(err)
        );
      });

      if (printers.length === 0) {
        this.addMessage('No USB printers found. Please connect a printer.', true);
        return;
      }

      const printer = printers[0];

      // Request USB permissions
      await new Promise<void>((resolve, reject) => {
        ThermalPrinter.requestPermissions(
          printer,
          () => resolve(),
          (err: any) => {
            this.addMessage('USB permission denied', true);
            reject(err);
          }
        );
      });

      // Print test page
      await new Promise<void>((resolve, reject) => {
        const testText =
          "[C]<u><font size='big'>TEST PAGE</font></u>\n" +
          "[C]Thermal Printer Demo\n" +
          "[L]Date: " + new Date().toLocaleString() + "\n" +
          "[C]<barcode>12345678</barcode>\n" +
          "[C]<qrcode size='20'>https://example.com</qrcode>\n" +
          "[C]End of test\n";

        ThermalPrinter.printFormattedText(
          {
            type: 'usb',
            id: printer.id,
            text: testText
          },
          () => {
            this.addMessage('Test page printed via USB!', false);
            resolve();
          },
          (err: any) => {
            this.addMessage('USB print failed: ' + JSON.stringify(err), true);
            reject(err);
          }
        );
      });
    } catch (error) {
      this.addMessage('USB printing error: ' + JSON.stringify(error), true);
    }
  }

  async printTestPageNetwork() {
    if (!this.printerIP || !this.printerPort) {
      this.addMessage('Please enter IP address and port', true);
      return;
    }

    if (typeof ThermalPrinter !== 'undefined') {
      try {
        await new Promise<void>((resolve, reject) => {
          const testText =
            "[C]<u><font size='big'>TEST PAGE</font></u>\n" +
            "[C]Thermal Printer Demo\n" +
            "[L]Date: " + new Date().toLocaleString() + "\n" +
            "[C]<barcode>12345678</barcode>\n" +
            "[C]<qrcode size='20'>https://example.com</qrcode>\n" +
            "[C]End of test\n";

          ThermalPrinter.printFormattedText(
            {
              type: 'tcp',
              address: this.printerIP,
              port: this.printerPort,
              id: 'network-printer',
              text: testText
            },
            () => {
              this.addMessage('Test page printed via network!', false);
              resolve();
            },
            (err: any) => {
              this.addMessage('Network print failed: ' + JSON.stringify(err), true);
              reject(err);
            }
          );
        });
      } catch (error) {
        this.addMessage('Network printing error: ' + JSON.stringify(error), true);
      }
    } else {
      // If on iOS, use printer plugin for AirPrint fallback
      if (this.platform.is('ios') && typeof cordova !== 'undefined' && cordova.plugins && cordova.plugins.printer) {
        const printer = cordova.plugins.printer;

        const html = `
          <html>
            <body style="width: 300px; font-family: monospace;">
              <div style="text-align: center;">
                <h1>TEST PAGE</h1>
                <p>Thermal Printer Demo</p>
                <p>Date: ${new Date().toLocaleString()}</p>
                <p>End of test</p>
              </div>
            </body>
          </html>
        `;

        printer.print(html, {
          name: 'Test Document',
          duplex: false
        }, (success: boolean) => {
          if (success) {
            this.addMessage('Document sent to printer', false);
          } else {
            this.addMessage('Print canceled', true);
          }
        });
      } else {
        this.addMessage('Network printing not available on this platform', true);
      }
    }
  }

  async printReceipt() {
    try {
      if (this.printerType === 'bluetooth') {
        if (!this.selectedPrinter) {
          this.addMessage('Please select a Bluetooth printer first', true);
          return;
        }

        await this.printReceiptBluetooth();
      } else if (this.printerType === 'usb') {
        await this.printReceiptUSB();
      } else if (this.printerType === 'network') {
        await this.printReceiptNetwork();
      }
    } catch (error) {
      this.addMessage('Print error: ' + JSON.stringify(error), true);
    }
  }

  async printReceiptBluetooth() {
    if (typeof ThermalPrinter !== 'undefined' && this.platform.is('android')) {
      // Android using ThermalPrinter plugin
      await new Promise<void>((resolve, reject) => {
        const receiptText = this.formatReceiptText();

        ThermalPrinter.printFormattedText(
          {
            type: 'bluetooth',
            id: this.selectedPrinter.id,
            text: receiptText
          },
          () => {
            this.addMessage('Receipt printed successfully!', false);
            resolve();
          },
          (err: any) => {
            this.addMessage('Print failed: ' + JSON.stringify(err), true);
            reject(err);
          }
        );
      });
    } else if (typeof BluetoothSerial !== 'undefined') {
      // Using BluetoothSerial plugin (iOS or fallback)
      try {
        await new Promise<void>((resolve, reject) => {
          BluetoothSerial.connect(
            this.selectedPrinter.id,
            () => {
              // Connection successful
              // Send basic ESC/POS commands for the receipt
              const receiptData = this.formatSimpleReceiptEscPos();

              BluetoothSerial.write(
                receiptData,
                () => {
                  BluetoothSerial.disconnect();
                  this.addMessage('Receipt printed successfully!', false);
                  resolve();
                },
                (err: any) => {
                  BluetoothSerial.disconnect();
                  reject(err);
                }
              );
            },
            (err: any) => reject(err)
          );
        });
      } catch (error) {
        this.addMessage('Bluetooth print error: ' + JSON.stringify(error), true);
      }
    } else {
      this.addMessage('Bluetooth printing not available on this platform', true);
    }
  }

  async printReceiptUSB() {
    if (typeof ThermalPrinter === 'undefined' || !this.platform.is('android')) {
      this.addMessage('USB printing is only available on Android', true);
      return;
    }

    try {
      // List USB printers
      const printers = await new Promise<any[]>((resolve, reject) => {
        ThermalPrinter.listPrinters(
          { type: 'usb' },
          (printers: any[]) => resolve(printers),
          (err: any) => reject(err)
        );
      });

      if (printers.length === 0) {
        this.addMessage('No USB printers found. Please connect a printer.', true);
        return;
      }

      const printer = printers[0];

      // Request USB permissions
      await new Promise<void>((resolve, reject) => {
        ThermalPrinter.requestPermissions(
          printer,
          () => resolve(),
          (err: any) => {
            this.addMessage('USB permission denied', true);
            reject(err);
          }
        );
      });

      // Print receipt
      await new Promise<void>((resolve, reject) => {
        const receiptText = this.formatReceiptText();

        ThermalPrinter.printFormattedText(
          {
            type: 'usb',
            id: printer.id,
            text: receiptText
          },
          () => {
            this.addMessage('Receipt printed via USB!', false);
            resolve();
          },
          (err: any) => {
            this.addMessage('USB print failed: ' + JSON.stringify(err), true);
            reject(err);
          }
        );
      });
    } catch (error) {
      this.addMessage('USB printing error: ' + JSON.stringify(error), true);
    }
  }

  async printReceiptNetwork() {
    if (!this.printerIP || !this.printerPort) {
      this.addMessage('Please enter IP address and port', true);
      return;
    }

    if (typeof ThermalPrinter !== 'undefined') {
      try {
        await new Promise<void>((resolve, reject) => {
          const receiptText = this.formatReceiptText();

          ThermalPrinter.printFormattedText(
            {
              type: 'tcp',
              address: this.printerIP,
              port: this.printerPort,
              id: 'network-printer',
              text: receiptText
            },
            () => {
              this.addMessage('Receipt printed via network!', false);
              resolve();
            },
            (err: any) => {
              this.addMessage('Network print failed: ' + JSON.stringify(err), true);
              reject(err);
            }
          );
        });
      } catch (error) {
        this.addMessage('Network printing error: ' + JSON.stringify(error), true);
      }
    } else {
      // If on iOS, use printer plugin for AirPrint fallback
      if (this.platform.is('ios') && typeof cordova !== 'undefined' && cordova.plugins && cordova.plugins.printer) {
        const printer = cordova.plugins.printer;

        const html = `
          <html>
            <body style="width: 300px; font-family: monospace;">
              <div style="text-align: center;">
                <h2>STORE NAME</h2>
                <p>123 Main Street</p>
                <p>City, State 12345</p>
                <p>Tel: (123) 456-7890</p>
                <hr style="border-top: 1px dashed #8c8c8c;">
                <p>Receipt #1001</p>
                <p>${new Date().toLocaleString()}</p>
                <hr style="border-top: 1px dashed #8c8c8c;">
              </div>

              <div style="display: flex; justify-content: space-between;">
                <span>Item A</span>
                <span>$10.99</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>Item B</span>
                <span>$5.99</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>Item C</span>
                <span>$7.50</span>
              </div>

              <hr style="border-top: 1px dashed #8c8c8c;">

              <div style="display: flex; justify-content: space-between; font-weight: bold;">
                <span>Total</span>
                <span>$24.48</span>
              </div>

              <div style="text-align: center; margin-top: 20px;">
                <p>www.example.com</p>
                <p>Thank you for your purchase!</p>
              </div>
            </body>
          </html>
        `;

        printer.print(html, {
          name: 'Receipt',
          duplex: false
        }, (success: boolean) => {
          if (success) {
            this.addMessage('Receipt sent to printer', false);
          } else {
            this.addMessage('Print canceled', true);
          }
        });
      } else {
        this.addMessage('Network printing not available on this platform', true);
      }
    }
  }

  // Format receipt text for ThermalPrinter plugin
  formatReceiptText(): string {
    return (
      "[C]<font size='big'>STORE NAME</font>\n" +
      "[C]123 Main Street\n" +
      "[C]City, State 12345\n" +
      "[C]Tel: (123) 456-7890\n" +
      "[C]================================\n" +
      "[C]Receipt #1001\n" +
      "[C]" + new Date().toLocaleString() + "\n" +
      "[C]================================\n\n" +
      "[L]Item A[R]$10.99\n" +
      "[L]Item B[R]$5.99\n" +
      "[L]Item C[R]$7.50\n\n" +
      "[C]--------------------------------\n" +
      "[L]<font size='big'>Total</font>[R]<font size='big'>$24.48</font>\n\n" +
      "[C]<qrcode size='20'>https://example.com</qrcode>\n" +
      "[C]www.example.com\n\n" +
      "[C]Thank you for your purchase!\n\n\n"
    );
  }

  // Format receipt using raw ESC/POS commands for BluetoothSerial
  formatSimpleReceiptEscPos(): string {
    return (
      '\x1B@' +        // Initialize printer
      '\x1B\x61\x01' + // Center align
      '\x1B\x21\x30' + // Large bold text
      'STORE NAME\n' +
      '\x1B\x21\x00' + // Normal text
      '123 Main Street\n' +
      'City, State 12345\n' +
      'Tel: (123) 456-7890\n' +
      '================================\n' +
      'Receipt #1001\n' +
      new Date().toLocaleString() + '\n' +
      '================================\n\n' +
      '\x1B\x61\x00' + // Left align
      'Item A                      $10.99\n' +
      'Item B                       $5.99\n' +
      'Item C                       $7.50\n\n' +
      '\x1B\x61\x01' + // Center align
      '--------------------------------\n' +
      '\x1B\x21\x10' + // Bold text
      'Total:                     $24.48\n\n' +
      '\x1B\x21\x00' + // Normal text
      'www.example.com\n\n' +
      'Thank you for your purchase!\n\n\n\n' +
      '\x1B\x64\x03'  // Feed paper and cut
    );
  }
}
