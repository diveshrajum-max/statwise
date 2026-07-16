import {
  BarChart3,
  Database,
  Sigma,
  Target,
  TrendingUp,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Sidebar from "../../components/layout/Sidebar";
import Header from "../../components/layout/Header";

import * as XLSX from "xlsx";

import { supabase } from "../../lib/supabase";

import "./DescriptiveStatistics.css";

/* ========================================
   TYPES
======================================== */

type Dataset = {
  id: number | string;

  dataset_name: string | null;

  file_name: string | null;

  file_path: string | null;

  sheet_name: string | null;

  row_count: number | null;

  column_count: number | null;
};

type StatisticsResult = {
  mean: number;

  median: number;

  mode: string;

  standardDeviation: number;

  variance: number;

  range: number;

  iqr: number;

  minimum: number;

  q1: number;

  q3: number;

  maximum: number;

  skewness: number;

  kurtosis: number;

  sampleSize: number;

  coefficientOfVariation: number;
};

/* ========================================
   HELPER FUNCTIONS
======================================== */

const calculateMean = (
  values: number[],
) => {
  return (
    values.reduce(
      (
        total,
        value,
      ) =>
        total +
        value,
      0,
    ) /
    values.length
  );
};

const calculateMedian = (
  values: number[],
) => {
  const sortedValues = [
    ...values,
  ].sort(
    (
      first,
      second,
    ) =>
      first -
      second,
  );

  const middleIndex =
    Math.floor(
      sortedValues.length /
        2,
    );

  if (
    sortedValues.length %
      2 ===
    0
  ) {
    return (
      sortedValues[
        middleIndex -
          1
      ] +
      sortedValues[
        middleIndex
      ]
    ) /
      2;
  }

  return sortedValues[
    middleIndex
  ];
};

const calculatePercentile = (
  values: number[],
  percentile: number,
) => {
  const sortedValues = [
    ...values,
  ].sort(
    (
      first,
      second,
    ) =>
      first -
      second,
  );

  const position =
    (
      sortedValues.length -
      1
    ) *
    percentile;

  const lowerIndex =
    Math.floor(
      position,
    );

  const upperIndex =
    Math.ceil(
      position,
    );

  if (
    lowerIndex ===
    upperIndex
  ) {
    return sortedValues[
      lowerIndex
    ];
  }

  const decimalPosition =
    position -
    lowerIndex;

  return (
    sortedValues[
      lowerIndex
    ] +
    decimalPosition *
      (
        sortedValues[
          upperIndex
        ] -
        sortedValues[
          lowerIndex
        ]
      )
  );
};

const calculateMode = (
  values: number[],
) => {
  const frequencies =
    new Map<
      number,
      number
    >();

  values.forEach(
    (
      value,
    ) => {
      frequencies.set(
        value,
        (
          frequencies.get(
            value,
          ) ??
          0
        ) +
          1,
      );
    },
  );

  let highestFrequency =
    0;

  frequencies.forEach(
    (
      frequency,
    ) => {
      highestFrequency =
        Math.max(
          highestFrequency,
          frequency,
        );
    },
  );

  if (
    highestFrequency <=
    1
  ) {
    return "Multiple";
  }

  const modes =
    Array.from(
      frequencies.entries(),
    )
      .filter(
        (
          [
            ,
            frequency,
          ],
        ) =>
          frequency ===
          highestFrequency,
      )
      .map(
        (
          [
            value,
          ],
        ) =>
          value,
      );

  if (
    modes.length >
    1
  ) {
    return "Multiple";
  }

  return modes[
    0
  ].toFixed(
    3,
  );
};

const formatNumber = (
  value: number,
) => {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    return "0.000";
  }

  return value.toFixed(
    3,
  );
};

/* ========================================
   COMPONENT
======================================== */

function DescriptiveStatistics() {
  /* Uploaded datasets */

  const [
    datasets,
    setDatasets,
  ] =
    useState<
      Dataset[]
    >(
      [],
    );

  /* Selected values */

  const [
    selectedDatasetId,
    setSelectedDatasetId,
  ] =
    useState(
      "",
    );

  const [
    selectedColumn,
    setSelectedColumn,
  ] =
    useState(
      "",
    );

  /* Dataset rows */

  const [
    datasetRows,
    setDatasetRows,
  ] =
    useState<
      Record<
        string,
        unknown
      >[]
    >(
      [],
    );

  const [
    numericColumns,
    setNumericColumns,
  ] =
    useState<
      string[]
    >(
      [],
    );

  /* Page states */

  const [
    loadingDatasets,
    setLoadingDatasets,
  ] =
    useState(
      true,
    );

  const [
    loadingFile,
    setLoadingFile,
  ] =
    useState(
      false,
    );

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState(
      "",
    );

  const [
    statistics,
    setStatistics,
  ] =
    useState<
      StatisticsResult |
      null
    >(
      null,
    );

  /* ========================================
     LOAD DATASETS FROM SUPABASE
  ======================================== */

  useEffect(
    () => {
      const loadDatasets =
        async () => {
          try {
            setLoadingDatasets(
              true,
            );

            setErrorMessage(
              "",
            );

            const {
              data,
              error,
            } =
              await supabase
                .from(
                  "datasets",
                )
                .select(
                  "*",
                )
                .order(
                  "created_at",
                  {
                    ascending:
                      false,
                  },
                );

            if (
              error
            ) {
              throw error;
            }

            setDatasets(
              (
                data ??
                []
              ) as Dataset[],
            );
          } catch (
            error
          ) {
            console.error(
              "Unable to load datasets:",
              error,
            );

            setErrorMessage(
              "Unable to load uploaded datasets.",
            );
          } finally {
            setLoadingDatasets(
              false,
            );
          }
        };

      void loadDatasets();
    },
    [],
  );

  /* ========================================
     CURRENT SELECTED DATASET
  ======================================== */

  const selectedDataset =
    useMemo(
      () => {
        return datasets.find(
          (
            dataset,
          ) =>
            String(
              dataset.id,
            ) ===
            selectedDatasetId,
        );
      },
      [
        datasets,
        selectedDatasetId,
      ],
    );

  /* ========================================
     LOAD SELECTED EXCEL OR CSV FILE
  ======================================== */

  const handleDatasetChange =
    async (
      datasetId: string,
    ) => {
      setSelectedDatasetId(
        datasetId,
      );

      setSelectedColumn(
        "",
      );

      setDatasetRows(
        [],
      );

      setNumericColumns(
        [],
      );

      setStatistics(
        null,
      );

      setErrorMessage(
        "",
      );

      if (
        !datasetId
      ) {
        return;
      }

      const dataset =
        datasets.find(
          (
            currentDataset,
          ) =>
            String(
              currentDataset.id,
            ) ===
            datasetId,
        );

      if (
        !dataset ||
        !dataset.file_path
      ) {
        setErrorMessage(
          "The selected dataset does not have a valid file path.",
        );

        return;
      }

      try {
        setLoadingFile(
          true,
        );

        /*
        Download the uploaded file
        from Supabase Storage.
        */

        const {
          data:
            downloadedFile,
          error:
            downloadError,
        } =
          await supabase
            .storage
            .from(
              "dataset_files",
            )
            .download(
              dataset.file_path,
            );

        if (
          downloadError
        ) {
          throw downloadError;
        }

        if (
          !downloadedFile
        ) {
          throw new Error(
            "The downloaded dataset file is empty.",
          );
        }

        /*
        Convert the downloaded file
        into an ArrayBuffer.
        */

        const arrayBuffer =
          await downloadedFile
            .arrayBuffer();

        /*
        Read the Excel or CSV file.
        */

        const workbook =
          XLSX.read(
            arrayBuffer,
            {
              type:
                "array",
            },
          );

        /*
        Use the saved worksheet.

        If it cannot be found,
        use the first worksheet.
        */

        const worksheetName =
          dataset.sheet_name &&
          workbook
            .SheetNames
            .includes(
              dataset.sheet_name,
            )
            ? dataset
                .sheet_name
            : workbook
                .SheetNames[
                  0
                ];

        if (
          !worksheetName
        ) {
          throw new Error(
            "No worksheet was found in the selected file.",
          );
        }

        const worksheet =
          workbook
            .Sheets[
              worksheetName
            ];

        if (
          !worksheet
        ) {
          throw new Error(
            "The selected worksheet could not be opened.",
          );
        }

        /*
        Convert the worksheet
        into JavaScript objects.
        */

        const rows =
          XLSX.utils
            .sheet_to_json<
              Record<
                string,
                unknown
              >
            >(
              worksheet,
              {
                defval:
                  null,
              },
            );

        if (
          rows.length ===
          0
        ) {
          throw new Error(
            "The selected worksheet does not contain any data.",
          );
        }

        /*
        Get all column names.
        */

        const allColumns =
          Object.keys(
            rows[
              0
            ],
          );

        /*
        Detect numeric columns.

        A column is considered
        numeric when at least
        80% of its non-empty
        values are numbers.
        */

        const detectedNumericColumns =
          allColumns.filter(
            (
              column,
            ) => {
              const nonEmptyValues =
                rows
                  .map(
                    (
                      row,
                    ) =>
                      row[
                        column
                      ],
                  )
                  .filter(
                    (
                      value,
                    ) =>
                      value !==
                        null &&
                      value !==
                        undefined &&
                      String(
                        value,
                      ).trim() !==
                        "",
                  );

              if (
                nonEmptyValues
                  .length ===
                0
              ) {
                return false;
              }

              const numericValueCount =
                nonEmptyValues
                  .filter(
                    (
                      value,
                    ) =>
                      Number.isFinite(
                        Number(
                          value,
                        ),
                      ),
                  )
                  .length;

              return (
                numericValueCount /
                  nonEmptyValues
                    .length >=
                0.8
              );
            },
          );

        setDatasetRows(
          rows,
        );

        setNumericColumns(
          detectedNumericColumns,
        );

        if (
          detectedNumericColumns
            .length ===
          0
        ) {
          setErrorMessage(
            "No numeric columns were detected in this dataset.",
          );
        }
      } catch (
        error
      ) {
        console.error(
          "Unable to open dataset:",
          error,
        );

        if (
          error instanceof
          Error
        ) {
          setErrorMessage(
            error.message,
          );
        } else {
          setErrorMessage(
            "Unable to open the selected dataset.",
          );
        }
      } finally {
        setLoadingFile(
          false,
        );
      }
    };

    

  /* ========================================
     CALCULATE STATISTICS
  ======================================== */

  const calculateStatistics =
  async () => {
    setErrorMessage(
      "",
    );

    if (
      !selectedDatasetId
    ) {
      setErrorMessage(
        "Select a dataset.",
      );

      return;
    }

    if (
      !selectedColumn ||
      datasetRows.length ===
        0
    ) {
      setErrorMessage(
        "Select a numeric column.",
      );

      return;
    }

    const values =
      datasetRows
        .map(
          (
            row,
          ) =>
            Number(
              row[
                selectedColumn
              ],
            ),
        )
        .filter(
          (
            value,
          ) =>
            Number.isFinite(
              value,
            ),
        );

    if (
      values.length ===
      0
    ) {
      setErrorMessage(
        "No valid numeric values were found in the selected column.",
      );

      return;
    }

    const mean =
      calculateMean(
        values,
      );

    const median =
      calculateMedian(
        values,
      );

    const minimum =
      Math.min(
        ...values,
      );

    const maximum =
      Math.max(
        ...values,
      );

    const range =
      maximum -
      minimum;

    const q1 =
      calculatePercentile(
        values,
        0.25,
      );

    const q3 =
      calculatePercentile(
        values,
        0.75,
      );

    const iqr =
      q3 -
      q1;

    /*
    Sample variance:
    divide by n - 1.
    */

    const variance =
      values.length >
      1
        ? values.reduce(
            (
              total,
              value,
            ) =>
              total +
              Math.pow(
                value -
                  mean,
                2,
              ),
            0,
          ) /
          (
            values.length -
            1
          )
        : 0;

    const standardDeviation =
      Math.sqrt(
        variance,
      );

    const sampleSize =
      values.length;

    const skewness =
      standardDeviation >
        0 &&
      sampleSize >
        2
        ? values.reduce(
            (
              total,
              value,
            ) =>
              total +
              Math.pow(
                (
                  value -
                  mean
                ) /
                  standardDeviation,
                3,
              ),
            0,
          ) /
          sampleSize
        : 0;

    const kurtosis =
      standardDeviation >
        0 &&
      sampleSize >
        3
        ? values.reduce(
            (
              total,
              value,
            ) =>
              total +
              Math.pow(
                (
                  value -
                  mean
                ) /
                  standardDeviation,
                4,
              ),
            0,
          ) /
            sampleSize -
          3
        : 0;

    const coefficientOfVariation =
      mean !==
      0
        ? (
            standardDeviation /
            Math.abs(
              mean,
            )
          ) *
          100
        : 0;

    /*
    Display the calculated
    statistics.
    */

    setStatistics(
      {
        mean,

        median,

        mode:
          calculateMode(
            values,
          ),

        standardDeviation,

        variance,

        range,

        iqr,

        minimum,

        q1,

        q3,

        maximum,

        skewness,

        kurtosis,

        sampleSize,

        coefficientOfVariation,
      },
    );

    /*
    Save completed analysis
    in Supabase.
    */

    try {
      const {
        error:
          analysisHistoryError,
      } =
        await supabase
          .from(
            "analysis_history",
          )
          .insert({
            analysis_type:
              "descriptive_statistics",

            dataset_id:
              String(
                selectedDatasetId,
              ),

            dataset_name:
              selectedDataset
                ?.dataset_name ??
              selectedDataset
                ?.file_name ??
              "Untitled Dataset",

            /*
            The mean is saved as
            the main result value.
            */

            result_value:
              mean,

            /*
            Classification is not
            required for descriptive
            statistics.
            */

            classification:
              null,
          });

      if (
        analysisHistoryError
      ) {
        console.error(
          "Unable to save descriptive statistics history:",
          analysisHistoryError,
        );
      }

    } catch (
      error
    ) {
      console.error(
        "Unable to save descriptive statistics history:",
        error,
      );
    }
  };

  /* ========================================
     INTERPRETATION TEXT
  ======================================== */

  const variabilityText =
    statistics &&
    statistics
      .coefficientOfVariation <
      10
      ? "Low variability"
      : statistics &&
          statistics
            .coefficientOfVariation <
            20
        ? "Moderate variability"
        : "High variability";

  const skewnessText =
    statistics &&
    statistics.skewness >
      0.1
      ? "Right-skewed (positive)"
      : statistics &&
          statistics.skewness <
            -0.1
        ? "Left-skewed (negative)"
        : "Approximately symmetric";

  const kurtosisText =
    statistics &&
    statistics.kurtosis >
      0
      ? "Leptokurtic (heavy tails)"
      : statistics &&
          statistics.kurtosis <
            0
        ? "Platykurtic (light tails)"
        : "Mesokurtic";

  /* ========================================
     PAGE
  ======================================== */

  return (
    <div className="descriptive-page">
      <Sidebar />

      <Header />

      <main className="descriptive-content">
        {/* Heading */}

        <section className="descriptive-heading">
          <h1>
            Descriptive Statistics
          </h1>

          <p>
            Calculate comprehensive
            statistical measures for
            your data
          </p>
        </section>

        {/* Analysis configuration */}

        <section className="statistics-configuration-card">
          <h2>
            Analysis Configuration
          </h2>

          <div className="statistics-selection-grid">
            {/* Dataset selection */}

            <label>
              <span>
                Select Dataset
              </span>

              <select
                value={
                  selectedDatasetId
                }
                disabled={
                  loadingDatasets
                }
                onChange={(
                  event,
                ) =>
                  void handleDatasetChange(
                    event
                      .target
                      .value,
                  )
                }
              >
                <option value="">
                  {
                    loadingDatasets
                      ? "Loading datasets..."
                      : "Choose a dataset"
                  }
                </option>

                {
                  datasets.map(
                    (
                      dataset,
                    ) => (
                      <option
                        key={
                          dataset.id
                        }
                        value={
                          String(
                            dataset.id,
                          )
                        }
                      >
                        {
                          dataset
                            .dataset_name ||
                          dataset
                            .file_name ||
                          "Untitled Dataset"
                        }
                      </option>
                    ),
                  )
                }
              </select>
            </label>

            {/* Numeric-column selection */}

            <label>
              <span>
                Select Numeric Column
              </span>

              <select
                value={
                  selectedColumn
                }
                disabled={
                  !selectedDataset ||
                  loadingFile ||
                  numericColumns
                    .length ===
                    0
                }
                onChange={(
                  event,
                ) => {
                  setSelectedColumn(
                    event
                      .target
                      .value,
                  );

                  setStatistics(
                    null,
                  );
                }}
              >
                <option value="">
                  {
                    loadingFile
                      ? "Reading file..."
                      : "Choose a column"
                  }
                </option>

                {
                  numericColumns.map(
                    (
                      column,
                    ) => (
                      <option
                        key={
                          column
                        }
                        value={
                          column
                        }
                      >
                        {
                          column
                        }
                      </option>
                    ),
                  )
                }
              </select>
            </label>
          </div>

          {/* Calculate button */}

          <button
            type="button"
            className="calculate-statistics-button"
            disabled={
              !selectedDatasetId ||
              !selectedColumn ||
              datasetRows
                .length ===
                0
            }
            onClick={
              calculateStatistics
            }
          >
            <BarChart3
              size={
                20
              }
            />

            Calculate Statistics
          </button>

          {/* Error message */}

          {
            errorMessage &&
            (
              <p className="statistics-error-message">
                {
                  errorMessage
                }
              </p>
            )
          }
        </section>

        {/* Empty result state */}

        {
          !statistics &&
          (
            <section className="statistics-empty-card">
              <Database
                size={
                  76
                }
              />

              <h2>
                No Analysis Results
              </h2>

              <p>
                Select a dataset
                and column, then
                click “Calculate
                Statistics” to
                view results
              </p>
            </section>
          )
        }

        {/* Statistics results */}

        {
          statistics &&
          (
            <>
              {/* Central tendency */}

              <section className="statistics-results-section">
                <h2>
                  Central Tendency
                </h2>

                <div className="central-tendency-grid">
                  {/* Mean */}

                  <article className="large-statistics-card">
                    <div>
                      <p>
                        Mean
                        (Average)
                      </p>

                      <strong>
                        {
                          formatNumber(
                            statistics
                              .mean,
                          )
                        }
                      </strong>
                    </div>

                    <div className="statistics-result-icon mean-result-icon">
                      <Target
                        size={
                          28
                        }
                      />
                    </div>
                  </article>

                  {/* Median */}

                  <article className="large-statistics-card">
                    <div>
                      <p>
                        Median
                      </p>

                      <strong>
                        {
                          formatNumber(
                            statistics
                              .median,
                          )
                        }
                      </strong>
                    </div>

                    <div className="statistics-result-icon median-result-icon">
                      <TrendingUp
                        size={
                          28
                        }
                      />
                    </div>
                  </article>

                  {/* Mode */}

                  <article className="large-statistics-card">
                    <div>
                      <p>
                        Mode
                      </p>

                      <strong>
                        {
                          statistics
                            .mode
                        }
                      </strong>
                    </div>

                    <div className="statistics-result-icon mode-result-icon">
                      <BarChart3
                        size={
                          28
                        }
                      />
                    </div>
                  </article>
                </div>
              </section>

              {/* Dispersion */}

              <section className="statistics-results-section">
                <h2>
                  Dispersion
                  &amp; Spread
                </h2>

                <div className="dispersion-grid">
                  {/* Standard deviation */}

                  <article className="small-statistics-card">
                    <h3>
                      <Sigma
                        size={
                          23
                        }
                      />

                      Standard
                      Deviation
                    </h3>

                    <strong>
                      {
                        formatNumber(
                          statistics
                            .standardDeviation,
                        )
                      }
                    </strong>
                  </article>

                  {/* Variance */}

                  <article className="small-statistics-card">
                    <h3>
                      <BarChart3
                        size={
                          23
                        }
                      />

                      Variance
                    </h3>

                    <strong>
                      {
                        formatNumber(
                          statistics
                            .variance,
                        )
                      }
                    </strong>
                  </article>

                  {/* Range */}

                  <article className="small-statistics-card">
                    <h3>
                      <TrendingUp
                        size={
                          23
                        }
                      />

                      Range
                    </h3>

                    <strong>
                      {
                        formatNumber(
                          statistics
                            .range,
                        )
                      }
                    </strong>
                  </article>

                  {/* IQR */}

                  <article className="small-statistics-card">
                    <h3>
                      <BarChart3
                        size={
                          23
                        }
                      />

                      IQR
                    </h3>

                    <strong>
                      {
                        formatNumber(
                          statistics
                            .iqr,
                        )
                      }
                    </strong>
                  </article>
                </div>
              </section>

              {/* Range and quartiles */}

              <section className="statistics-results-section">
                <h2>
                  Range &amp;
                  Quartiles
                </h2>

                <div className="quartile-grid">
                  {/* Minimum */}

                  <article>
                    <p>
                      Minimum
                    </p>

                    <strong>
                      {
                        formatNumber(
                          statistics
                            .minimum,
                        )
                      }
                    </strong>
                  </article>

                  {/* First quartile */}

                  <article>
                    <p>
                      Q1 (25th)
                    </p>

                    <strong>
                      {
                        formatNumber(
                          statistics
                            .q1,
                        )
                      }
                    </strong>
                  </article>

                  {/* Median */}

                  <article className="median-quartile-card">
                    <p>
                      Median
                      (Q2)
                    </p>

                    <strong>
                      {
                        formatNumber(
                          statistics
                            .median,
                        )
                      }
                    </strong>
                  </article>

                  {/* Third quartile */}

                  <article>
                    <p>
                      Q3 (75th)
                    </p>

                    <strong>
                      {
                        formatNumber(
                          statistics
                            .q3,
                        )
                      }
                    </strong>
                  </article>

                  {/* Maximum */}

                  <article>
                    <p>
                      Maximum
                    </p>

                    <strong>
                      {
                        formatNumber(
                          statistics
                            .maximum,
                        )
                      }
                    </strong>
                  </article>
                </div>
              </section>

              {/* Distribution shape */}

              <section className="statistics-results-section">
                <h2>
                  Distribution
                  Shape
                </h2>

                <div className="distribution-grid">
                  {/* Skewness */}

                  <article>
                    <h3>
                      Skewness
                    </h3>

                    <strong>
                      {
                        formatNumber(
                          statistics
                            .skewness,
                        )
                      }
                    </strong>

                    <p>
                      {
                        skewnessText
                      }
                    </p>
                  </article>

                  {/* Kurtosis */}

                  <article>
                    <h3>
                      Kurtosis
                    </h3>

                    <strong>
                      {
                        formatNumber(
                          statistics
                            .kurtosis,
                        )
                      }
                    </strong>

                    <p>
                      {
                        kurtosisText
                      }
                    </p>
                  </article>

                  {/* Sample size */}

                  <article>
                    <h3>
                      Sample Size
                    </h3>

                    <strong>
                      {
                        statistics
                          .sampleSize
                      }
                    </strong>

                    <p>
                      Valid
                      observations
                    </p>
                  </article>
                </div>
              </section>

              {/* Interpretation */}

              <section className="statistical-interpretation-card">
                <h2>
                  Statistical
                  Interpretation
                </h2>

                <p>
                  <strong>
                    Coefficient
                    of
                    Variation:
                  </strong>
                  {" "}
                  {
                    statistics
                      .coefficientOfVariation
                      .toFixed(
                        2,
                      )
                  }
                  % ·{" "}
                  {
                    variabilityText
                  }
                </p>

                <p>
                  <strong>
                    Data
                    Spread:
                  </strong>
                  {" "}
                  The data
                  ranges from{" "}
                  {
                    formatNumber(
                      statistics
                        .minimum,
                    )
                  }
                  {" "}
                  to{" "}
                  {
                    formatNumber(
                      statistics
                        .maximum,
                    )
                  }
                  , with 50%
                  of values
                  between{" "}
                  {
                    formatNumber(
                      statistics
                        .q1,
                    )
                  }
                  {" "}
                  and{" "}
                  {
                    formatNumber(
                      statistics
                        .q3,
                    )
                  }
                  .
                </p>

                <p>
                  <strong>
                    Distribution:
                  </strong>
                  {" "}
                  The data
                  shows some
                  deviation
                  from normal
                  distribution.
                </p>
              </section>
            </>
          )
        }
      </main>
    </div>
  );
}

export default DescriptiveStatistics;