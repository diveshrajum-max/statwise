import {
  Building2,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Database,
  Factory,
  FileSpreadsheet,
  Package,
  Table2,
  Upload,
  X,
} from "lucide-react";

import {
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";

import * as XLSX from "xlsx";

import Sidebar from "../../components/layout/Sidebar";
import Header from "../../components/layout/Header";
import { supabase } from "../../lib/supabase";

import "./UploadDataset.css";

/* Plant information */

const plants = [
  {
    id: "chennai",
    name: "Chennai Plant",
    location: "Chennai, Tamil Nadu",
    productCount: 5,
  },
  {
    id: "trichy",
    name: "Trichy Plant",
    location: "Trichy, Tamil Nadu",
    productCount: 3,
  },
  {
    id: "pondicherry",
    name: "Pondicherry Plant",
    location: "Pondicherry",
    productCount: 4,
  },
];

/* Product information */

const products = {
  chennai: [
    {
      id: "cvbl",
      code: "CVBL",
      name: "Commercial Vehicle Brake Lining",
      description:
        "Brake lining for commercial trucks, buses & heavy vehicles",
    },
    {
      id: "clutch-facing",
      code: "Clutch Facing",
      name: "Clutch Facing",
      description:
        "Friction material for automotive clutch assemblies",
    },
    {
      id: "disc-pad",
      code: "Disc Pad",
      name: "Disc Brake Pad",
      description:
        "Disc brake pads for passenger and commercial vehicles",
    },
    {
      id: "pcbl",
      code: "PCBL",
      name: "Passenger Car Brake Lining",
      description:
        "Brake lining for passenger cars and light commercial vehicles",
    },
    {
      id: "cv-brake-shoe",
      code: "CV Brake Shoe",
      name: "Commercial Vehicle Brake Shoe",
      description:
        "Drum brake shoes for heavy commercial vehicles",
    },
  ],

  trichy: [
    {
      id: "pcdp",
      code: "PCDP",
      name: "Passenger Car Disc Pad",
      description:
        "High-performance disc pads for passenger cars",
    },
    {
      id: "pcbl",
      code: "PCBL",
      name: "Passenger Car Brake Lining",
      description:
        "Brake lining for passenger cars and light commercial vehicles",
    },
    {
      id: "cvbl",
      code: "CVBL",
      name: "Commercial Vehicle Brake Lining",
      description:
        "Brake lining for commercial trucks, buses & heavy vehicles",
    },
  ],

  pondicherry: [
    {
      id: "twdp",
      code: "TWDP",
      name: "Two Wheeler Disc Pad",
      description:
        "Disc brake pads for motorcycles and scooters",
    },
    {
      id: "cvdp",
      code: "CVDP",
      name: "Commercial Vehicle Disc Pad",
      description:
        "Heavy-duty disc brake pads for commercial vehicles",
    },
    {
      id: "pcdp",
      code: "PCDP",
      name: "Passenger Car Disc Pad",
      description:
        "High-performance disc pads for passenger cars",
    },
    {
      id: "rail-disc-pad",
      code: "Rail Disc Pad",
      name: "Railway Disc Brake Pad",
      description:
        "Disc brake pads for railway and metro rolling stock",
    },
  ],
};

function UploadDataset() {
  /* File input */

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  /* File states */

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [sheetNames, setSheetNames] =
    useState<string[]>([]);

  const [selectedSheet, setSelectedSheet] =
    useState("");

  /* Upload progress */

  const [currentStep, setCurrentStep] =
    useState(1);

  /* Plant and product */

  const [selectedPlant, setSelectedPlant] =
    useState("");

  const [selectedProduct, setSelectedProduct] =
    useState("");

  /* Dataset information */

  const [datasetName, setDatasetName] =
    useState("");

  const [batchNumber, setBatchNumber] =
    useState("");

  const [productionDate, setProductionDate] =
    useState("");

  const [shift, setShift] =
    useState("");

  const [machine, setMachine] =
    useState("");

  const [operator, setOperator] =
    useState("");

  const [notes, setNotes] =
    useState("");

  /* Preview information */

  const [previewHeaders, setPreviewHeaders] =
    useState<string[]>([]);

  const [previewRows, setPreviewRows] =
    useState<unknown[][]>([]);

  const [totalRows, setTotalRows] =
    useState(0);

  const [totalColumns, setTotalColumns] =
    useState(0);

  /* Upload state */

  const [uploadComplete, setUploadComplete] =
    useState(false);
  const [isUploading, setIsUploading] =
    useState(false);

  const [uploadError, setUploadError] =
    useState("");

  /* Drag and error */

  const [isDragging, setIsDragging] =
    useState(false);

  const [fileError, setFileError] =
    useState("");

  /* Supported file extensions */

  const allowedExtensions = [
    "csv",
    "xls",
    "xlsx",
  ];

  /* Find selected plant */

  const currentPlant = plants.find(
    (plant) =>
      plant.id === selectedPlant,
  );

  /* Get products for selected plant */

  const availableProducts =
    selectedPlant &&
    selectedPlant in products
      ? products[
          selectedPlant as keyof typeof products
        ]
      : [];

  /* Find selected product */

  const currentProduct =
    availableProducts.find(
      (product) =>
        product.id === selectedProduct,
    );

  /* Open file browser */

  const openFileBrowser = () => {
    fileInputRef.current?.click();
  };

  /* Get file extension */

  const getFileExtension = (
    file: File,
  ) => {
    return (
      file.name
        .split(".")
        .pop()
        ?.toLowerCase() ?? ""
    );
  };

  /* Format file size */

  const formatFileSize = (
    size: number,
  ) => {
    if (size < 1024) {
      return `${size} bytes`;
    }

    if (size < 1024 * 1024) {
      return `${(
        size / 1024
      ).toFixed(1)} KB`;
    }

    return `${(
      size /
      (1024 * 1024)
    ).toFixed(2)} MB`;
  };

  /* Remove file extension */

  const getDatasetName = (
    fileName: string,
  ) => {
    return fileName.replace(
      /\.[^/.]+$/,
      "",
    );
  };

  /* Read uploaded file */

  const readSelectedFile = async (
    file: File,
  ) => {
    setFileError("");

    const extension =
      getFileExtension(file);

    if (
      !allowedExtensions.includes(
        extension,
      )
    ) {
      setFileError(
        "Please select a CSV, XLS, or XLSX file.",
      );

      return;
    }

    try {
      const fileData =
        await file.arrayBuffer();

      const workbook = XLSX.read(
        fileData,
        {
          type: "array",
        },
      );

      const workbookSheets =
        workbook.SheetNames;

      if (
        workbookSheets.length === 0
      ) {
        setFileError(
          "No worksheet was found in this file.",
        );

        return;
      }

      setSelectedFile(file);

      setSheetNames(
        workbookSheets,
      );

      setSelectedSheet(
        workbookSheets[0],
      );

      setSelectedPlant("");

      setSelectedProduct("");

      setDatasetName(
        getDatasetName(file.name),
      );

      setBatchNumber("");

      setProductionDate("");

      setShift("");

      setMachine("");

      setOperator("");

      setNotes("");

      setPreviewHeaders([]);

      setPreviewRows([]);

      setTotalRows(0);

      setTotalColumns(0);

      setUploadComplete(false);

      setCurrentStep(2);
    } catch (error) {
      console.error(
        "File reading error:",
        error,
      );

      setFileError(
        "The selected file could not be read. Please check the file and try again.",
      );
    }
  };

  /* File browser selection */

  const handleFileChange = (
    event:
      ChangeEvent<HTMLInputElement>,
  ) => {
    const file =
      event.target.files?.[0];

    if (file) {
      readSelectedFile(file);
    }

    event.target.value = "";
  };

  /* Drag over */

  const handleDragOver = (
    event:
      DragEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();

    setIsDragging(true);
  };

  /* Drag leave */

  const handleDragLeave = (
    event:
      DragEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();

    setIsDragging(false);
  };

  /* Drop file */

  const handleDrop = (
    event:
      DragEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();

    setIsDragging(false);

    const file =
      event.dataTransfer.files[0];

    if (file) {
      readSelectedFile(file);
    }
  };

  /* Remove selected file */

  const removeSelectedFile = () => {
    setSelectedFile(null);

    setSheetNames([]);

    setSelectedSheet("");

    setSelectedPlant("");

    setSelectedProduct("");

    setDatasetName("");

    setBatchNumber("");

    setProductionDate("");

    setShift("");

    setMachine("");

    setOperator("");

    setNotes("");

    setPreviewHeaders([]);

    setPreviewRows([]);

    setTotalRows(0);

    setTotalColumns(0);

    setUploadComplete(false);

    setIsUploading(false);

    setUploadError("");

    setCurrentStep(1);

    setFileError("");
  };

  /* Prepare selected worksheet preview */

  const prepareSheetPreview =
    async () => {
      if (
        !selectedFile ||
        !selectedSheet
      ) {
        return;
      }

      try {
        setFileError("");

        const fileData =
          await selectedFile.arrayBuffer();

        const workbook = XLSX.read(
          fileData,
          {
            type: "array",
          },
        );

        const worksheet =
          workbook.Sheets[
            selectedSheet
          ];

        if (!worksheet) {
          setFileError(
            "The selected worksheet could not be found.",
          );

          return;
        }

        const sheetData =
          XLSX.utils.sheet_to_json<
            unknown[]
          >(
            worksheet,
            {
              header: 1,
              defval: "",
            },
          );

        if (
          sheetData.length === 0
        ) {
          setPreviewHeaders([]);

          setPreviewRows([]);

          setTotalRows(0);

          setTotalColumns(0);

          setUploadComplete(false);

          setCurrentStep(6);

          return;
        }

        const headers =
          sheetData[0].map(
            (
              value,
              index,
            ) => {
              const header =
                String(
                  value,
                ).trim();

              return (
                header ||
                `Column ${
                  index + 1
                }`
              );
            },
          );

        const dataRows =
          sheetData.slice(1);

        setPreviewHeaders(
          headers,
        );

        setPreviewRows(
          dataRows.slice(
            0,
            5,
          ),
        );

        setTotalRows(
          dataRows.length,
        );

        setTotalColumns(
          headers.length,
        );

        setUploadComplete(false);

        setCurrentStep(6);
      } catch (error) {
        console.error(
          "Sheet preview error:",
          error,
        );

        setFileError(
          "The selected worksheet could not be previewed.",
        );
      }
    };
      /* Upload file and dataset details to Supabase */

  const uploadDatasetToSupabase =
    async () => {
      if (
        !selectedFile ||
        !currentPlant ||
        !currentProduct ||
        !selectedSheet ||
        !datasetName.trim()
      ) {
        setUploadError(
          "Some required dataset information is missing.",
        );

        return;
      }

      try {
        setIsUploading(true);

        setUploadError("");

        setUploadComplete(false);

        /*
        Make the file name safe and unique.

        Date.now() prevents files with the
        same name from replacing each other.
        */

        const safeFileName =
          selectedFile.name.replace(
            /[^a-zA-Z0-9._-]/g,
            "_",
          );

        const uniqueFilePath =
          `${Date.now()}-${safeFileName}`;

        /* Upload actual file to Storage */

        const {
          error: storageError,
        } = await supabase.storage
          .from("dataset_files")
          .upload(
            uniqueFilePath,
            selectedFile,
            {
              cacheControl:
                "3600",

              upsert: false,
            },
          );

        if (storageError) {
          throw storageError;
        }

        /* Save information in datasets table */

        const {
          error: databaseError,
        } = await supabase
          .from("datasets")
          .insert({
            dataset_name:
              datasetName.trim(),

            description:
              notes.trim() ||
              null,

            file_name:
              selectedFile.name,

            file_path:
              uniqueFilePath,

            file_type:
              getFileExtension(
                selectedFile,
              ) || null,

            sheet_name:
              selectedSheet,

            plant:
              currentPlant.name,

            product:
              currentProduct.code,

            batch_number:
              batchNumber.trim() ||
              null,

            production_date:
              productionDate ||
              null,

            shift:
              shift || null,

            machine:
              machine.trim() ||
              null,

            operator_name:
              operator.trim() ||
              null,

            row_count:
              totalRows,

            column_count:
              totalColumns,
          });

        if (databaseError) {
          /*
          If database saving fails,
          remove the file from Storage.
          */

          await supabase.storage
            .from(
              "dataset_files",
            )
            .remove([
              uniqueFilePath,
            ]);

          throw databaseError;
        }

        setUploadComplete(
          true,
        );
      } catch (error) {
        console.error(
          "Dataset upload error:",
          error,
        );

        if (
          error instanceof Error
        ) {
          setUploadError(
            error.message,
          );
        } else {
          setUploadError(
            "The dataset could not be uploaded. Please try again.",
          );
        }
      } finally {
        setIsUploading(
          false,
        );
      }
    };

  return (
    <div className="upload-page">
      <Sidebar />

      <Header />

      <main className="upload-content">
        {/* Page heading */}

        <section className="upload-heading">
          <h1>
            Dataset Upload
          </h1>

          <p>
            Upload Excel or CSV files —
            guided wizard assigns plant,
            product, and metadata.
          </p>
        </section>

        {/* Progress */}

        <section className="upload-progress">
          {/* Step 1 */}

          <div
            className={`progress-step ${
              currentStep === 1
                ? "active"
                : currentStep > 1
                  ? "completed"
                  : ""
            }`}
          >
            <div className="step-circle">
              {currentStep > 1 ? (
                <Check
                  size={18}
                />
              ) : (
                1
              )}
            </div>

            <span>
              Choose File
            </span>
          </div>

          <div
            className={`progress-line ${
              currentStep > 1
                ? "completed-line"
                : ""
            }`}
          />

          {/* Step 2 */}

          <div
            className={`progress-step ${
              currentStep === 2
                ? "active"
                : currentStep > 2
                  ? "completed"
                  : ""
            }`}
          >
            <div className="step-circle">
              {currentStep > 2 ? (
                <Check
                  size={18}
                />
              ) : (
                2
              )}
            </div>

            <span>
              Select Sheet
            </span>
          </div>

          <div
            className={`progress-line ${
              currentStep > 2
                ? "completed-line"
                : ""
            }`}
          />

          {/* Step 3 */}

          <div
            className={`progress-step ${
              currentStep === 3
                ? "active"
                : currentStep > 3
                  ? "completed"
                  : ""
            }`}
          >
            <div className="step-circle">
              {currentStep > 3 ? (
                <Check
                  size={18}
                />
              ) : (
                3
              )}
            </div>

            <span>
              Select Plant
            </span>
          </div>

          <div
            className={`progress-line ${
              currentStep > 3
                ? "completed-line"
                : ""
            }`}
          />

          {/* Step 4 */}

          <div
            className={`progress-step ${
              currentStep === 4
                ? "active"
                : currentStep > 4
                  ? "completed"
                  : ""
            }`}
          >
            <div className="step-circle">
              {currentStep > 4 ? (
                <Check
                  size={18}
                />
              ) : (
                4
              )}
            </div>

            <span>
              Select Product
            </span>
          </div>

          <div
            className={`progress-line ${
              currentStep > 4
                ? "completed-line"
                : ""
            }`}
          />

          {/* Step 5 */}

          <div
            className={`progress-step ${
              currentStep === 5
                ? "active"
                : currentStep > 5
                  ? "completed"
                  : ""
            }`}
          >
            <div className="step-circle">
              {currentStep > 5 ? (
                <Check
                  size={18}
                />
              ) : (
                5
              )}
            </div>

            <span>
              Details
            </span>
          </div>

          <div
            className={`progress-line ${
              currentStep > 5
                ? "completed-line"
                : ""
            }`}
          />

          {/* Step 6 */}

          <div
            className={`progress-step ${
              currentStep === 6
                ? "active"
                : ""
            }`}
          >
            <div className="step-circle">
              6
            </div>

            <span>
              Upload
            </span>
          </div>
        </section>

        {/* Hidden file input */}

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xls,.xlsx"
          onChange={
            handleFileChange
          }
          className="hidden-file-input"
        />

        {/* STEP 1 */}

        {currentStep === 1 && (
          <section className="file-upload-card">
            <div
              className={`upload-drop-zone ${
                isDragging
                  ? "dragging"
                  : ""
              }`}
              onClick={
                openFileBrowser
              }
              onDragOver={
                handleDragOver
              }
              onDragLeave={
                handleDragLeave
              }
              onDrop={
                handleDrop
              }
            >
              <div className="upload-main-icon">
                <Upload
                  size={48}
                />
              </div>

              <h2>
                Drop your file here or
                click to browse
              </h2>

              <p>
                Supports CSV, Excel
                (.xlsx, .xls).
                Multi-sheet workbooks
                are supported.
              </p>

              <span>
                Column headers and data
                types are detected
                automatically.
              </span>

              <button
                type="button"
                className="browse-file-button"
                onClick={(
                  event,
                ) => {
                  event.stopPropagation();

                  openFileBrowser();
                }}
              >
                <FileSpreadsheet
                  size={20}
                />

                Browse Files
              </button>

              <div className="supported-file-types">
                <div>
                  <Check
                    size={17}
                  />

                  CSV
                </div>

                <div>
                  <Check
                    size={17}
                  />

                  XLS
                </div>

                <div>
                  <Check
                    size={17}
                  />

                  XLSX
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Error */}

        {fileError && (
          <div className="file-error-message">
            {fileError}
          </div>
        )}

        {/* STEP 2 */}

        {currentStep === 2 &&
          selectedFile && (
            <section className="sheet-selection-card">
              <div className="selected-file-summary">
                <div className="selected-file-left">
                  <div className="selected-file-icon">
                    <FileSpreadsheet
                      size={27}
                    />
                  </div>

                  <div>
                    <h2>
                      {
                        selectedFile.name
                      }
                    </h2>

                    <p>
                      {formatFileSize(
                        selectedFile.size,
                      )}

                      {" · "}

                      {
                        sheetNames.length
                      }

                      {sheetNames.length ===
                      1
                        ? " sheet"
                        : " sheets"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="remove-file-button"
                  onClick={
                    removeSelectedFile
                  }
                >
                  <X
                    size={19}
                  />

                  Remove
                </button>
              </div>

              <div className="sheet-heading">
                <h2>
                  Select Sheet
                </h2>

                <p>
                  Choose the worksheet
                  containing the data you
                  want to upload.
                </p>
              </div>

              <div className="sheet-list">
                {sheetNames.map(
                  (
                    sheetName,
                  ) => (
                    <button
                      type="button"
                      key={
                        sheetName
                      }
                      className={`sheet-option ${
                        selectedSheet ===
                        sheetName
                          ? "selected"
                          : ""
                      }`}
                      onClick={() =>
                        setSelectedSheet(
                          sheetName,
                        )
                      }
                    >
                      <FileSpreadsheet
                        size={23}
                      />

                      <span>
                        {
                          sheetName
                        }
                      </span>

                      {selectedSheet ===
                        sheetName && (
                        <Check
                          size={20}
                        />
                      )}
                    </button>
                  ),
                )}
              </div>

              <div className="sheet-actions">
                <button
                  type="button"
                  className="secondary-upload-button button-with-icon"
                  onClick={
                    removeSelectedFile
                  }
                >
                  <ChevronLeft
                    size={18}
                  />

                  Back
                </button>

                <button
                  type="button"
                  className="primary-upload-button button-with-icon"
                  disabled={
                    !selectedSheet
                  }
                  onClick={() =>
                    setCurrentStep(
                      3,
                    )
                  }
                >
                  Next: Select Plant

                  <ChevronRight
                    size={18}
                  />
                </button>
              </div>
            </section>
          )}

        {/* STEP 3 */}

        {currentStep === 3 &&
          selectedFile && (
            <section className="plant-selection-card">
              <div className="selection-page-heading">
                <div className="selection-heading-icon">
                  <Factory
                    size={29}
                  />
                </div>

                <div>
                  <h2>
                    Select Plant
                  </h2>

                  <p>
                    Which manufacturing
                    plant does this
                    dataset belong to?
                  </p>
                </div>
              </div>

              <div className="selection-file-information">
                <FileSpreadsheet
                  size={19}
                />

                <strong>
                  {
                    selectedFile.name
                  }
                </strong>

                <span>·</span>

                <strong className="selected-sheet-label">
                  {
                    selectedSheet
                  }
                </strong>
              </div>

              <div className="plant-options-grid">
                {plants.map(
                  (plant) => (
                    <button
                      type="button"
                      key={
                        plant.id
                      }
                      className={`plant-option-card ${
                        selectedPlant ===
                        plant.id
                          ? "selected"
                          : ""
                      }`}
                      onClick={() => {
                        setSelectedPlant(
                          plant.id,
                        );

                        setSelectedProduct(
                          "",
                        );
                      }}
                    >
                      <div className="plant-card-icon">
                        <Building2
                          size={27}
                        />
                      </div>

                      <h3>
                        {
                          plant.name
                        }
                      </h3>

                      <p>
                        {
                          plant.location
                        }
                      </p>

                      <span>
                        {
                          plant.productCount
                        }{" "}
                        products
                      </span>

                      {selectedPlant ===
                        plant.id && (
                        <div className="plant-selected-check">
                          <Check
                            size={16}
                          />
                        </div>
                      )}
                    </button>
                  ),
                )}
              </div>

              <div className="selection-actions">
                <button
                  type="button"
                  className="secondary-upload-button button-with-icon"
                  onClick={() =>
                    setCurrentStep(
                      2,
                    )
                  }
                >
                  <ChevronLeft
                    size={18}
                  />

                  Back
                </button>

                <button
                  type="button"
                  className="primary-upload-button button-with-icon"
                  disabled={
                    !selectedPlant
                  }
                  onClick={() =>
                    setCurrentStep(
                      4,
                    )
                  }
                >
                  Next: Select Product

                  <ChevronRight
                    size={18}
                  />
                </button>
              </div>
            </section>
          )}

        {/* STEP 4 */}

        {currentStep === 4 &&
          selectedFile &&
          currentPlant && (
            <section className="product-selection-card">
              <div className="selection-page-heading">
                <div className="selection-heading-icon">
                  <Package
                    size={29}
                  />
                </div>

                <div>
                  <h2>
                    Select Product
                  </h2>

                  <p>
                    Choose the product
                    associated with this
                    dataset.
                  </p>
                </div>
              </div>

              <div className="selected-plant-information">
                <Building2
                  size={20}
                />

                <div>
                  <span>
                    Selected Plant
                  </span>

                  <strong>
                    {
                      currentPlant.name
                    }
                  </strong>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedProduct(
                      "",
                    );

                    setCurrentStep(
                      3,
                    );
                  }}
                >
                  Change Plant
                </button>
              </div>

              <div className="product-options-grid">
                {availableProducts.map(
                  (
                    product,
                  ) => (
                    <button
                      type="button"
                      key={
                        product.id
                      }
                      className={`product-option-card ${
                        selectedProduct ===
                        product.id
                          ? "selected"
                          : ""
                      }`}
                      onClick={() =>
                        setSelectedProduct(
                          product.id,
                        )
                      }
                    >
                      <div className="product-code">
                        {
                          product.code
                        }
                      </div>

                      <h3>
                        {
                          product.name
                        }
                      </h3>

                      <p>
                        {
                          product.description
                        }
                      </p>

                      {selectedProduct ===
                        product.id && (
                        <div className="product-selected-check">
                          <Check
                            size={16}
                          />
                        </div>
                      )}
                    </button>
                  ),
                )}
              </div>

              <div className="selection-actions">
                <button
                  type="button"
                  className="secondary-upload-button button-with-icon"
                  onClick={() =>
                    setCurrentStep(
                      3,
                    )
                  }
                >
                  <ChevronLeft
                    size={18}
                  />

                  Back
                </button>

                <button
                  type="button"
                  className="primary-upload-button button-with-icon"
                  disabled={
                    !selectedProduct
                  }
                  onClick={() =>
                    setCurrentStep(
                      5,
                    )
                  }
                >
                  Next: Dataset Details

                  <ChevronRight
                    size={18}
                  />
                </button>
              </div>
            </section>
          )}

        {/* STEP 5 */}

        {currentStep === 5 &&
          selectedFile &&
          currentPlant &&
          currentProduct && (
            <section className="dataset-details-card">
              <div className="selection-page-heading">
                <div className="selection-heading-icon">
                  <FileSpreadsheet
                    size={29}
                  />
                </div>

                <div>
                  <h2>
                    Dataset Details
                  </h2>

                  <p>
                    Add information to
                    identify and organize
                    this dataset.
                  </p>
                </div>
              </div>

              <div className="details-selection-summary">
                <div>
                  <span>
                    Plant
                  </span>

                  <strong>
                    {
                      currentPlant.name
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    Product
                  </span>

                  <strong>
                    {
                      currentProduct.code
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    File
                  </span>

                  <strong>
                    {
                      selectedFile.name
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    Sheet
                  </span>

                  <strong>
                    {
                      selectedSheet
                    }
                  </strong>
                </div>
              </div>

              <div className="dataset-details-form">
                <div className="details-form-field full-width-field">
                  <label htmlFor="dataset-name">
                    Dataset Name

                    <span>
                      *
                    </span>
                  </label>

                  <input
                    id="dataset-name"
                    type="text"
                    value={
                      datasetName
                    }
                    onChange={(
                      event,
                    ) =>
                      setDatasetName(
                        event
                          .target
                          .value,
                      )
                    }
                    placeholder="Enter dataset name"
                  />
                </div>

                <div className="details-form-field">
                  <label htmlFor="batch-number">
                    Batch Number
                  </label>

                  <input
                    id="batch-number"
                    type="text"
                    value={
                      batchNumber
                    }
                    onChange={(
                      event,
                    ) =>
                      setBatchNumber(
                        event
                          .target
                          .value,
                      )
                    }
                    placeholder="Example: BATCH-2026-001"
                  />
                </div>

                <div className="details-form-field">
                  <label htmlFor="production-date">
                    Production Date
                  </label>

                  <input
                    id="production-date"
                    type="date"
                    value={
                      productionDate
                    }
                    onChange={(
                      event,
                    ) =>
                      setProductionDate(
                        event
                          .target
                          .value,
                      )
                    }
                  />
                </div>

                <div className="details-form-field">
                  <label htmlFor="shift">
                    Shift
                  </label>

                  <select
                    id="shift"
                    value={
                      shift
                    }
                    onChange={(
                      event,
                    ) =>
                      setShift(
                        event
                          .target
                          .value,
                      )
                    }
                  >
                    <option value="">
                      Select shift
                    </option>

                    <option value="Shift A">
                      Shift A
                    </option>

                    <option value="Shift B">
                      Shift B
                    </option>

                    <option value="Shift C">
                      Shift C
                    </option>

                    <option value="General Shift">
                      General Shift
                    </option>
                  </select>
                </div>

                <div className="details-form-field">
                  <label htmlFor="machine">
                    Machine
                  </label>

                  <input
                    id="machine"
                    type="text"
                    value={
                      machine
                    }
                    onChange={(
                      event,
                    ) =>
                      setMachine(
                        event
                          .target
                          .value,
                      )
                    }
                    placeholder="Enter machine name or ID"
                  />
                </div>

                <div className="details-form-field">
                  <label htmlFor="operator">
                    Operator
                  </label>

                  <input
                    id="operator"
                    type="text"
                    value={
                      operator
                    }
                    onChange={(
                      event,
                    ) =>
                      setOperator(
                        event
                          .target
                          .value,
                      )
                    }
                    placeholder="Enter operator name or ID"
                  />
                </div>

                <div className="details-form-field full-width-field">
                  <label htmlFor="dataset-notes">
                    Notes
                  </label>

                  <textarea
                    id="dataset-notes"
                    value={
                      notes
                    }
                    onChange={(
                      event,
                    ) =>
                      setNotes(
                        event
                          .target
                          .value,
                      )
                    }
                    placeholder="Add additional information"
                    rows={5}
                  />
                </div>
              </div>

              <div className="selection-actions">
                <button
                  type="button"
                  className="secondary-upload-button button-with-icon"
                  onClick={() =>
                    setCurrentStep(
                      4,
                    )
                  }
                >
                  <ChevronLeft
                    size={18}
                  />

                  Back
                </button>

                <button
                  type="button"
                  className="primary-upload-button button-with-icon"
                  disabled={
                    !datasetName.trim()
                  }
                  onClick={
                    prepareSheetPreview
                  }
                >
                  Next: Review & Upload

                  <ChevronRight
                    size={18}
                  />
                </button>
              </div>
            </section>
          )}

        {/* STEP 6 */}

        {currentStep === 6 &&
          selectedFile &&
          currentPlant &&
          currentProduct && (
            <section className="review-upload-card">
              <div className="selection-page-heading">
                <div className="selection-heading-icon">
                  <Upload
                    size={29}
                  />
                </div>

                <div>
                  <h2>
                    Review & Upload
                  </h2>

                  <p>
                    Review the dataset
                    information before
                    completing the upload.
                  </p>
                </div>
              </div>

              <div className="review-summary-grid">
                <article className="review-summary-item">
                  <FileSpreadsheet
                    size={23}
                  />

                  <div>
                    <span>
                      Dataset
                    </span>

                    <strong>
                      {
                        datasetName
                      }
                    </strong>

                    <small>
                      {
                        selectedFile.name
                      }
                    </small>
                  </div>
                </article>

                <article className="review-summary-item">
                  <Building2
                    size={23}
                  />

                  <div>
                    <span>
                      Plant
                    </span>

                    <strong>
                      {
                        currentPlant.name
                      }
                    </strong>
                  </div>
                </article>

                <article className="review-summary-item">
                  <Package
                    size={23}
                  />

                  <div>
                    <span>
                      Product
                    </span>

                    <strong>
                      {
                        currentProduct.code
                      }
                    </strong>
                  </div>
                </article>

                <article className="review-summary-item">
                  <Table2
                    size={23}
                  />

                  <div>
                    <span>
                      Worksheet
                    </span>

                    <strong>
                      {
                        selectedSheet
                      }
                    </strong>

                    <small>
                      {totalRows} rows ·{" "}
                      {
                        totalColumns
                      }{" "}
                      columns
                    </small>
                  </div>
                </article>
              </div>

              <div className="review-preview-section">
                <div className="review-preview-heading">
                  <div>
                    <h3>
                      Data Preview
                    </h3>

                    <p>
                      Showing the first
                      five rows
                    </p>
                  </div>

                  <div className="preview-size-badge">
                    <Database
                      size={16}
                    />

                    {totalRows} rows ·{" "}
                    {
                      totalColumns
                    }{" "}
                    columns
                  </div>
                </div>

                {previewHeaders.length >
                0 ? (
                  <div className="review-table-wrapper">
                    <table className="review-data-table">
                      <thead>
                        <tr>
                          {previewHeaders.map(
                            (
                              header,
                              index,
                            ) => (
                              <th
                                key={`${header}-${index}`}
                              >
                                {
                                  header
                                }
                              </th>
                            ),
                          )}
                        </tr>
                      </thead>

                      <tbody>
                        {previewRows.map(
                          (
                            row,
                            rowIndex,
                          ) => (
                            <tr
                              key={
                                rowIndex
                              }
                            >
                              {previewHeaders.map(
                                (
                                  _,
                                  columnIndex,
                                ) => (
                                  <td
                                    key={
                                      columnIndex
                                    }
                                  >
                                    {String(
                                      row[
                                        columnIndex
                                      ] ??
                                        "",
                                    )}
                                  </td>
                                ),
                              )}
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-preview-message">
                    No data rows were
                    found.
                  </div>
                )}
              </div>
              {uploadError && (
                    <div className="upload-error-message">
                    <X size={23} />

                    <div>
                        <h3>
                        Dataset upload failed
                        </h3>

                        <p>
                            {uploadError}
                        </p>
                    </div>
                    </div>
                )}

              {uploadComplete && (
                <div className="upload-success-message">
                  <CheckCircle2
                    size={27}
                  />

                  <div>
                    <h3>
                      Dataset uploaded
                      successfully
                    </h3>

                    <p>
                      {datasetName} is
                      ready for
                      statistical
                      analysis.
                    </p>
                  </div>
                </div>
              )}

              <div className="selection-actions">
                <button
                  type="button"
                  className="secondary-upload-button button-with-icon"
                                    onClick={() => {
                    setUploadComplete(
                      false,
                    );

                    setUploadError(
                      "",
                    );

                    setCurrentStep(
                      5,
                    );
                  }}
                >
                  <ChevronLeft
                    size={18}
                  />

                  Back
                </button>

                                <button
                  type="button"
                  className="final-upload-button"
                  disabled={
                    uploadComplete ||
                    isUploading
                  }
                  onClick={
                    uploadDatasetToSupabase
                  }
                >
                  {isUploading ? (
                    <>
                      <Upload
                        size={19}
                      />

                      Uploading...
                    </>
                  ) : uploadComplete ? (
                    <>
                      <Check
                        size={19}
                      />

                      Uploaded
                    </>
                  ) : (
                    <>
                      <Upload
                        size={19}
                      />

                      Upload Dataset
                    </>
                  )}
                </button>
              </div>
            </section>
          )}
      </main>
    </div>
  );
}

export default UploadDataset;