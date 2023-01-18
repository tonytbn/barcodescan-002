import { Injectable } from "@angular/core";

// Import SDK from webpack directory to ensure web assembly binary and worker and bundled with webpack
import ScanbotSDK from "scanbot-web-sdk/webpack";

// Other typings should be imported from @types
import {
  IDocumentScannerHandle,
  ICroppingViewHandle,
  DocumentScannerConfiguration,
  CroppingViewConfiguration,
  BinarizationFilter,
  ColorFilter,
  ImageFilter,
  PdfGenerationOptions,
  PdfGenerator,
  TiffGenerationOptions,
  TiffGenerator,
  BarcodeScannerConfiguration,
  IBarcodeScannerHandle,
  Polygon,
  ContourDetectionResult,
  BarcodeResult,
  ITextDataScannerHandle,
  TextDataScannerConfiguration
} from "scanbot-web-sdk/@types";

import { IMrzScannerHandle } from "scanbot-web-sdk/@types/interfaces/i-mrz-scanner-handle";
import { MrzScannerConfiguration } from "scanbot-web-sdk/@types/model/configuration/mrz-scanner-configuration";
import { BarcodeFormat } from "scanbot-web-sdk/@types/model/barcode/barcode-format";
import { EngineMode } from "scanbot-web-sdk/@types/model/barcode/engine-mode";

// eslint-disable-next-line import/no-webpack-loader-syntax
require("!!file-loader?outputPath=tessdata&name=[name].[ext]!scanbot-web-sdk/bundle/bin/complete/tessdata/eng.traineddata");
// eslint-disable-next-line import/no-webpack-loader-syntax
require("!!file-loader?outputPath=tessdata&name=[name].[ext]!scanbot-web-sdk/bundle/bin/complete/tessdata/deu.traineddata");

@Injectable()
export class ScanbotSdkService {
  static CONTAINER_ID = "scanbot-camera-container";
  static BARCODE_SCANNER_CONTAINER_ID = "barcode-scanner-container";
  static MRZ_SCANNER_CONTAINER_ID = "mrz-scanner-container";
  static TEXTDATA_SCANNER_CONTAINER_ID = "textdata-scanner-container";

  private instance: ScanbotSDK;

  onReady: any;

  private documentScanner: IDocumentScannerHandle;
  private barcodeScanner: IBarcodeScannerHandle;
  private mrzScanner: IMrzScannerHandle;
  private textDataScanner: ITextDataScannerHandle;
  private cropper: ICroppingViewHandle;

  isReady(): boolean {
    return this.instance !== undefined;
  }

  constructor() {
    const options = { licenseKey: "" };
    ScanbotSDK.initialize(options).then((result) => {
      this.instance = result;
      if (this.onReady) {
        this.onReady();
      }
    });
  }

  async scanDocuments(configuration: DocumentScannerConfiguration, errorCallback: (e: Error) => void) {
    try {
      this.documentScanner = await this.instance.createDocumentScanner(
        configuration
      );
    } catch (e) {
      errorCallback(e);
    }
  }

  async scanBarcodes(configuration: BarcodeScannerConfiguration, errorCallback: (e: Error) => void) {
    try {
      this.barcodeScanner = await this.instance.createBarcodeScanner(
        configuration
      );
    } catch (e) {
      errorCallback(e);
    }
  }

  async scanMrz(configuration: MrzScannerConfiguration, errorCallback: (e: Error) => void) {
    try {
      this.mrzScanner = await this.instance.createMrzScanner(configuration);
    } catch (e) {
      errorCallback(e);
    }
  }

  async scanTextData(configuration: TextDataScannerConfiguration, errorCallback: (e: Error) => void) {
    try {
      this.textDataScanner = await this.instance.createTextDataScanner(configuration);
    } catch (e) {
      errorCallback(e);
    }
  }

  async setTextDataScannerDetectionStatus(pause: boolean) {
    if (pause) {
      this.textDataScanner.pauseDetection();
    } else {
      this.textDataScanner.resumeDetection();
    }
  }

  delayAutoCapture() {
    this.documentScanner.disableAutoCapture();
    setTimeout(() => {
      this.documentScanner.enableAutoCapture();
    }, 3000);
  }

  disposeDocumentScanner() {
    this.documentScanner.dispose();
  }

  disposeBarcodeScanner() {
    this.barcodeScanner.dispose();
  }

  disposeMrzScanner() {
    this.mrzScanner.dispose();
  }

  disposeTextDataScanner() {
    this.textDataScanner.dispose();
  }

  disposeCroppingView() {
    this.cropper.dispose();
  }

  async crop(configuration: CroppingViewConfiguration) {
    this.cropper = await this.instance.openCroppingView(configuration);
  }

  async detectInCropper() {
    await this.cropper.detect();
  }

  async rotateInCropper() {
    await this.cropper.rotate(1);
  }

  async applyCrop() {
    return await this.cropper.apply();
  }

  async toDataUrl(page: any) {
    return await this.instance.toDataUrl(
      page.filtered ?? page.cropped ?? page.original
    );
  }

  async licenseInfoString() {
    return JSON.stringify(await this.instance.getLicenseInfo());
  }

  async generatePDF(pages: any[]) {
    const options: PdfGenerationOptions = {
      standardPaperSize: "A4",
      landscape: true,
      dpi: 100,
    };
    const generator: PdfGenerator = await this.instance.beginPdf(options);
    for (const page of pages) {
      await generator.addPage(page.filtered ?? page.cropped ?? page.original);
    }
    return await generator.complete();
  }
  async generateTIFF(pages: any[]) {
    const options: TiffGenerationOptions = {
      binarizationFilter: "deepBinarization",
      dpi: 123,
    };
    const generator: TiffGenerator = await this.instance.beginTiff(options);
    for (const page of pages) {
      await generator.addPage(page.cropped ?? page.original);
    }
    return await generator.complete();
  }

  public async applyFilter(image: ArrayBuffer, filter: ImageFilter) {
    return await this.instance.applyFilter(image, filter);
  }

  public binarizationFilters(): BinarizationFilter[] {
    return [
      "binarized",
      "otsuBinarization",
      "pureBinarized",
      "lowLightBinarization",
      "lowLightBinarization2",
      "deepBinarization",
    ];
  }

  public colorFilters(): ColorFilter[] {
    return ["color", "gray", "colorDocument", "blackAndWhite", "edgeHighlight"];
  }

  public availableFilters(): string[] {
    return ["none"]
      .concat(this.binarizationFilters())
      .concat(this.colorFilters());
  }

  filterByIndex(value: string) {
    return this.availableFilters()[parseInt(value, 10)];
  }

  async detectBarcodes(base64: string, engineMode?: EngineMode, barcodeFormats?: BarcodeFormat[]): Promise<BarcodeResult> {
    return await this.instance!.detectBarcodes(base64, engineMode, barcodeFormats);
  }

  async detectDocument(image: ArrayBuffer): Promise<ContourDetectionResult> {
    return await this.instance!.detectDocument(image);
  }

  async cropAndRotateImageCcw(image: ArrayBuffer, polygon: Polygon, rotations: number): Promise<Uint8Array> {
    return await this.instance!.cropAndRotateImageCcw(image, polygon, rotations);
  }

  public swapDocumentScannerCameraFacing() {
    this.documentScanner?.swapCameraFacing(true);
  }

  public swapBarcodeScannerCameraFacing() {
    this.barcodeScanner?.swapCameraFacing(true);
  }

  public swapMrzScannerCameraFacing() {
    this.mrzScanner?.swapCameraFacing(true);
  }

  public swapTextDataScannerCameraFacing() {
    this.textDataScanner?.swapCameraFacing(true);
  }

  public async createBlurDetector() {
    return this.instance?.createBlurDetector();
  }
}
