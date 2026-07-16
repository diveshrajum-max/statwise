import {
  BarChart3,
  CheckCircle2,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import * as XLSX from "xlsx";

import { jStat } from "jstat";

import { supabase } from "../../lib/supabase";

import Sidebar from "../../components/layout/Sidebar";
import Header from "../../components/layout/Header";

import "./GraphicalSummary.css";


/* Dataset type */

type Dataset = {
  id: number | string;

  dataset_name: string | null;

  file_name: string | null;

  file_path: string | null;
};


/* Graphical result type */

type GraphicalResult = {
  datasetName: string;

  variableName: string;

  values: number[];

  validValues: number;

  mean: number;

  median: number;

  firstQuartile: number;

  thirdQuartile: number;

  interquartileRange: number;

  skewness: number;

  kurtosis: number;

  jarqueBeraStatistic: number;

  normalityPValue: number;

  isNormallyDistributed: boolean;

  qqPlotPoints: {
  theoretical: number;
  actual: number;
}[];

qqReferenceStart: {
  x: number;
  y: number;
};

qqReferenceEnd: {
  x: number;
  y: number;
};

qqRSquared: number;

  interpretation: string;

  standardDeviation: number;

  variance: number;

  minimum: number;

  maximum: number;

  range: number;
};


function GraphicalSummary() {
  /* Uploaded datasets */

  const [
    datasets,
    setDatasets,
  ] = useState<Dataset[]>([]);


  /* Selected dataset */

  const [
    selectedDatasetId,
    setSelectedDatasetId,
  ] = useState("");


  /* Dataset loading */

  const [
    loadingDatasets,
    setLoadingDatasets,
  ] = useState(true);


  /* Selected numeric variable */

  const [
    selectedVariable,
    setSelectedVariable,
  ] = useState("");


  /* Excel rows */

  const [
    datasetRows,
    setDatasetRows,
  ] = useState<
    Record<
      string,
      unknown
    >[]
  >([]);


  /* Numeric column names */

  const [
    numericColumns,
    setNumericColumns,
  ] = useState<
    string[]
  >([]);


  /* File loading */

  const [
    loadingFile,
    setLoadingFile,
  ] = useState(false);


  /* Error message */

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");


  /* Generated result */

  const [
    graphicalResult,
    setGraphicalResult,
  ] = useState<
    GraphicalResult | null
  >(null);


  /*
  Load uploaded datasets
  from Supabase
  */

  const loadDatasets =
    async () => {
      try {
        setLoadingDatasets(
          true,
        );

        setErrorMessage("");


        const {
          data,
          error,
        } = await supabase
          .from(
            "datasets",
          )
          .select(
            `
              id,
              dataset_name,
              file_name,
              file_path
            `,
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            },
          );


        if (error) {
          throw error;
        }


        setDatasets(
          (
            data ?? []
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
          error instanceof
            Error
            ? error.message
            : "Unable to load datasets.",
        );
      } finally {
        setLoadingDatasets(
          false,
        );
      }
    };


  /*
  Load datasets when
  this page opens
  */

  useEffect(
    () => {
      void loadDatasets();
    },
    [],
  );


  /*
  Run whenever the user
  selects a dataset
  */

  const handleDatasetChange =
    async (
      datasetId:
        string,
    ) => {
      /*
      Reset old results
      */

      setSelectedDatasetId(
        datasetId,
      );

      setSelectedVariable(
        "",
      );

      setDatasetRows(
        [],
      );

      setNumericColumns(
        [],
      );

      setGraphicalResult(
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


      /*
      Find the selected
      dataset
      */

      const selectedDataset =
        datasets.find(
          (
            dataset,
          ) =>
            String(
              dataset.id,
            ) ===
            datasetId,
        );


      if (
        !selectedDataset
      ) {
        setErrorMessage(
          "The selected dataset could not be found.",
        );

        return;
      }


      if (
        !selectedDataset
          .file_path
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
        Download the uploaded
        Excel or CSV file.

        Keep the same bucket
        name that is working
        in your project.
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
              selectedDataset
                .file_path,
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
        Convert file to
        ArrayBuffer
        */

        const arrayBuffer =
          await downloadedFile
            .arrayBuffer();


        /*
        Read Excel or CSV
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
        Open first sheet
        */

        const worksheetName =
          workbook
            .SheetNames[0];


        if (
          !worksheetName
        ) {
          throw new Error(
            "No worksheet was found in this dataset.",
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
            "The worksheet could not be opened.",
          );
        }


        /*
        Convert worksheet
        into rows
        */

        const rows =
          XLSX
            .utils
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
        Find all column
        names
        */

        const allColumns =
          Array.from(
            new Set(
              rows.flatMap(
                (
                  row,
                ) =>
                  Object.keys(
                    row,
                  ),
              ),
            ),
          );


        /*
        Detect numeric
        columns
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
                      )
                        .trim() !==
                        "",
                  );


              if (
                nonEmptyValues
                  .length ===
                0
              ) {
                return false;
              }


              const numericValues =
                nonEmptyValues
                  .filter(
                    (
                      value,
                    ) =>
                      Number
                        .isFinite(
                          Number(
                            value,
                          ),
                        ),
                  );


              return (
                numericValues
                  .length /
                  nonEmptyValues
                    .length >=
                0.8
              );
            },
          );


        /*
        Save Excel rows
        */

        setDatasetRows(
          rows,
        );


        /*
        Save numeric
        columns
        */

        setNumericColumns(
          detectedNumericColumns,
        );


        console.log(
          "Rows loaded:",
          rows,
        );


        console.log(
          "Numeric columns:",
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


        setErrorMessage(
          error instanceof
            Error
            ? error.message
            : "Unable to open the selected dataset.",
        );
      } finally {
        setLoadingFile(
          false,
        );
      }
    };


  /*
  Generate graphical
  summary
  */

  const handleGenerateSummary =
    async () => {
      setErrorMessage(
        "",
      );


      if (
        !selectedDatasetId
      ) {
        setErrorMessage(
          "Please select a dataset.",
        );

        return;
      }


      if (
        !selectedVariable
      ) {
        setErrorMessage(
          "Please select a numeric variable.",
        );

        return;
      }


      /*
      Extract numeric values
      from selected column
      */

      const numericValues =
        datasetRows
          .map(
            (
              row,
            ) =>
              Number(
                row[
                  selectedVariable
                ],
              ),
          )
          .filter(
            (
              value,
            ) =>
              Number
                .isFinite(
                  value,
                ),
          );


      if (
        numericValues
          .length ===
        0
      ) {
        setErrorMessage(
          "No valid numeric values were found in the selected variable.",
        );

        return;
      }


      /*
      Find selected dataset
      information
      */

      const selectedDataset =
        datasets.find(
          (
            dataset,
          ) =>
            String(
              dataset.id,
            ) ===
            selectedDatasetId,
        );


      /*
      Create result
      */
      /*
Sort values from
smallest to largest
*/

const sortedValues = [
  ...numericValues,
].sort(
  (firstValue, secondValue) =>
    firstValue - secondValue,
);


/*
Calculate mean
*/

const total =
  sortedValues.reduce(
    (
      currentTotal,
      value,
    ) =>
      currentTotal + value,
    0,
  );

const mean =
  total /
  sortedValues.length;


/*
Calculate median
*/

const middleIndex =
  Math.floor(
    sortedValues.length /
      2,
  );

const median =
  sortedValues.length %
    2 ===
  0
    ? (
        sortedValues[
          middleIndex - 1
        ] +
        sortedValues[
          middleIndex
        ]
      ) /
      2
    : sortedValues[
        middleIndex
      ];

      /*
Calculate a percentile
*/

const calculatePercentile = (
  values: number[],
  percentile: number,
) => {
  const position =
    (
      values.length -
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
    return values[
      lowerIndex
    ];
  }

  const decimalPart =
    position -
    lowerIndex;

  return (
    values[
      lowerIndex
    ] +
    decimalPart *
      (
        values[
          upperIndex
        ] -
        values[
          lowerIndex
        ]
      )
  );
};


/*
Calculate quartiles
*/

const firstQuartile =
  calculatePercentile(
    sortedValues,
    0.25,
  );

const thirdQuartile =
  calculatePercentile(
    sortedValues,
    0.75,
  );

const interquartileRange =
  thirdQuartile -
  firstQuartile;


/*
Calculate sample variance
*/

const squaredDifferences =
  sortedValues.map(
    (value) =>
      Math.pow(
        value - mean,
        2,
      ),
  );

const variance =
  squaredDifferences.reduce(
    (
      currentTotal,
      value,
    ) =>
      currentTotal + value,
    0,
  ) /
  (
    sortedValues.length -
    1
  );


/*
Calculate sample
standard deviation
*/

const standardDeviation =
  Math.sqrt(
    variance,
  );

  /*
Calculate skewness
*/

const sampleSize =
  sortedValues.length;

const thirdMoment =
  sortedValues.reduce(
    (
      total,
      value,
    ) =>
      total +
      Math.pow(
        value - mean,
        3,
      ),
    0,
  ) /
  sampleSize;

const skewness =
  standardDeviation === 0
    ? 0
    : thirdMoment /
      Math.pow(
        standardDeviation,
        3,
      );


/*
Calculate kurtosis

A normal distribution
has kurtosis close to 3.
*/

const fourthMoment =
  sortedValues.reduce(
    (
      total,
      value,
    ) =>
      total +
      Math.pow(
        value - mean,
        4,
      ),
    0,
  ) /
  sampleSize;

const kurtosis =
  standardDeviation === 0
    ? 0
    : fourthMoment /
      Math.pow(
        standardDeviation,
        4,
      );


/*
Jarque-Bera normality test
*/

const excessKurtosis =
  kurtosis - 3;

const jarqueBeraStatistic =
  (
    sampleSize /
    6
  ) *
  (
    Math.pow(
      skewness,
      2,
    ) +
    Math.pow(
      excessKurtosis,
      2,
    ) /
      4
  );


/*
The Jarque-Bera statistic
follows a chi-square
distribution with 2 degrees
of freedom.
*/

const normalityPValue =
  1 -
  jStat.chisquare.cdf(
    jarqueBeraStatistic,
    2,
  );


/*
At the 5% significance level:

p >= 0.05:
Do not reject normality

p < 0.05:
Reject normality
*/

const isNormallyDistributed =
  normalityPValue >=
  0.05;

  /*
Normal Probability Plot
(Q-Q Plot)
*/

const qqPlotPoints =
  sortedValues.map(
    (
      actualValue,
      index,
    ) => {
      /*
      Calculate cumulative
      probability for every
      observation.
      */

      const probability =
        (
          index +
          0.5
        ) /
        sampleSize;

      /*
      Convert probability into
      a theoretical normal
      quantile.
      */

      const theoreticalValue =
        jStat.normal.inv(
          probability,
          0,
          1,
        );

      return {
        theoretical:
          theoreticalValue,

        actual:
          actualValue,
      };
    },
  );


/*
Calculate the Q-Q reference line.

The expected data value is:

mean +
standard deviation ×
theoretical quantile
*/

const minimumTheoretical =
  qqPlotPoints[0]
    .theoretical;

const maximumTheoretical =
  qqPlotPoints[
    qqPlotPoints.length -
      1
  ].theoretical;


const qqReferenceStart = {
  x: minimumTheoretical,

  y:
    mean +
    standardDeviation *
      minimumTheoretical,
};


const qqReferenceEnd = {
  x: maximumTheoretical,

  y:
    mean +
    standardDeviation *
      maximumTheoretical,
};


/*
Calculate R-squared between
the theoretical values and
the actual observations.
*/

const theoreticalMean =
  qqPlotPoints.reduce(
    (
      total,
      point,
    ) =>
      total +
      point.theoretical,
    0,
  ) /
  qqPlotPoints.length;


const actualMean =
  qqPlotPoints.reduce(
    (
      total,
      point,
    ) =>
      total +
      point.actual,
    0,
  ) /
  qqPlotPoints.length;


const qqNumerator =
  qqPlotPoints.reduce(
    (
      total,
      point,
    ) =>
      total +
      (
        point.theoretical -
        theoreticalMean
      ) *
      (
        point.actual -
        actualMean
      ),
    0,
  );


const theoreticalVariation =
  qqPlotPoints.reduce(
    (
      total,
      point,
    ) =>
      total +
      Math.pow(
        point.theoretical -
          theoreticalMean,
        2,
      ),
    0,
  );


const actualVariation =
  qqPlotPoints.reduce(
    (
      total,
      point,
    ) =>
      total +
      Math.pow(
        point.actual -
          actualMean,
        2,
      ),
    0,
  );


const qqCorrelation =
  theoreticalVariation ===
      0 ||
    actualVariation ===
      0
    ? 1
    : qqNumerator /
      Math.sqrt(
        theoreticalVariation *
          actualVariation,
      );


const qqRSquared =
  Math.pow(
    qqCorrelation,
    2,
  );


/*
Automatic interpretation
*/

let distributionShape =
  "approximately symmetric";

if (
  skewness > 0.5
) {
  distributionShape =
    "positively skewed";
} else if (
  skewness < -0.5
) {
  distributionShape =
    "negatively skewed";
}


const interpretation =
  isNormallyDistributed
    ? `The ${selectedVariable} data is approximately normally distributed at the 5% significance level. The distribution is ${distributionShape}, with a mean of ${mean.toFixed(
        3,
      )} and a standard deviation of ${standardDeviation.toFixed(
        3,
      )}.`
    : `The ${selectedVariable} data does not follow a normal distribution at the 5% significance level. The distribution is ${distributionShape}. Consider checking for outliers, unusual observations, multiple process groups, or process instability before using methods that assume normality.`;


/*
Minimum, maximum
and range
*/

const minimum =
  sortedValues[0];

const maximum =
  sortedValues[
    sortedValues.length -
      1
  ];

const range =
  maximum - minimum;


/*
Save calculated
graphical results
*/

setGraphicalResult({
  datasetName:
    selectedDataset
      ?.dataset_name ||
    selectedDataset
      ?.file_name ||
    "Selected Dataset",

  variableName:
    selectedVariable,

  values:
    sortedValues,

  validValues:
    sortedValues.length,

  mean,

  median,

  firstQuartile,

  thirdQuartile,

  interquartileRange,

  skewness,

  kurtosis,

  jarqueBeraStatistic,

  normalityPValue,

  isNormallyDistributed,


qqPlotPoints,

qqReferenceStart,

qqReferenceEnd,

qqRSquared,


  interpretation,

  standardDeviation,

  variance,

  minimum,

  maximum,

  range,
});

/*
Save Graphical Summary
analysis history
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
          "graphical_summary",

        dataset_id:
          String(
            selectedDatasetId,
          ),

        dataset_name:
          selectedDataset
            ?.dataset_name ||
          selectedDataset
            ?.file_name ||
          "Selected Dataset",

        /*
        Save the mean as
        the primary result.
        */

        result_value:
          mean,

        /*
        Save the normality
        result.
        */

        classification:
          isNormallyDistributed
            ? "normal"
            : "not_normal",
      });

  if (
    analysisHistoryError
  ) {
    console.error(
      "Unable to save graphical summary history:",
      analysisHistoryError,
    );
  }

} catch (
  error
) {
  console.error(
    "Unable to save graphical summary history:",
    error,
  );
}


      console.log(
        "Values selected for graphical summary:",
        numericValues,
      );
    };

/*
Create histogram data
*/

const createHistogram = (
  values: number[],
) => {
  if (values.length === 0) {
    return [];
  }

  const minimum =
    Math.min(...values);

  const maximum =
    Math.max(...values);

  /*
  Use 8 histogram bars
  */

  const numberOfBins = 8;

  const dataRange =
    maximum - minimum;

  const binWidth =
    dataRange === 0
      ? 1
      : dataRange /
        numberOfBins;

  const histogramBins =
    Array.from(
      {
        length:
          numberOfBins,
      },

      (
        _,
        index,
      ) => ({
        start:
          minimum +
          index *
            binWidth,

        end:
          minimum +
          (
            index +
            1
          ) *
            binWidth,

        count: 0,
      }),
    );


  values.forEach(
    (value) => {
      let binIndex =
        Math.floor(
          (
            value -
            minimum
          ) /
            binWidth,
        );


      /*
      Put the maximum value
      inside the final bar
      */

      if (
        binIndex >=
        numberOfBins
      ) {
        binIndex =
          numberOfBins -
          1;
      }


      histogramBins[
        binIndex
      ].count += 1;
    },
  );


  return histogramBins;
};
  return (
    <div className="graphical-summary-page">
      {/* Sidebar */}

      <Sidebar />


      {/* Header */}

      <Header />


      {/* Main content */}

      <main className="graphical-summary-content">
        {/* Heading */}

        <section className="graphical-summary-heading">
          <h1>
            Graphical Summary
          </h1>


          <p>
            Visualize data
            distribution,
            variability, and
            normality using
            statistical graphs.
          </p>
        </section>


        {/* Configuration */}

        <section className="graphical-configuration-card">
          <h2>
            Analysis
            Configuration
          </h2>


          <div className="graphical-selection-grid">
            {/* Dataset */}

            <div className="graphical-input-group">
              <label>
                Select Dataset
              </label>


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
            </div>


            {/* Variable */}

            <div className="graphical-input-group">
              <label>
                Select Numeric
                Variable
              </label>


              <select
                value={
                  selectedVariable
                }

                disabled={
                  !selectedDatasetId ||
                  loadingFile ||
                  numericColumns
                    .length ===
                    0
                }

                onChange={(
                  event,
                ) => {
                  setSelectedVariable(
                    event
                      .target
                      .value,
                  );

                  setGraphicalResult(
                    null,
                  );
                }}
              >
                <option value="">
                  {
                    loadingFile
                      ? "Reading file..."
                      : "Choose a variable"
                  }
                </option>


                {
                  numericColumns
                    .map(
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
            </div>
          </div>


          {/* Generate button */}

          <button
            type="button"

            className="generate-summary-button"

            onClick={
              handleGenerateSummary
            }
          >
            <BarChart3
              size={
                20
              }
            />

            Generate Graphical
            Summary
          </button>


          {/* Error */}

          {
            errorMessage &&
            (
              <div className="graphical-error-message">
                {
                  errorMessage
                }
              </div>
            )
          }
        </section>


        {/* Results */}

        {
  graphicalResult
    ? (
      <section className="graphical-results-section">

        {/* Results heading */}

        <div className="graphical-results-heading">
          <div>
            <h2>
              Summary Statistics
            </h2>

            <p>
              Statistical summary for{" "}
              <strong>
                {
                  graphicalResult
                    .variableName
                }
              </strong>
            </p>
          </div>

          <div className="graphical-result-badge">
            <CheckCircle2
              size={18}
            />

            Analysis Complete
          </div>
        </div>


        {/* Statistics cards */}

        <div className="graphical-statistics-grid">

          <article className="graphical-stat-card">
            <span>
              Mean
            </span>

            <strong>
              {
                graphicalResult
                  .mean
                  .toFixed(3)
              }
            </strong>
          </article>


          <article className="graphical-stat-card">
            <span>
              Median
            </span>

            <strong>
              {
                graphicalResult
                  .median
                  .toFixed(3)
              }
            </strong>
          </article>


          <article className="graphical-stat-card">
            <span>
              Standard Deviation
            </span>

            <strong>
              {
                graphicalResult
                  .standardDeviation
                  .toFixed(3)
              }
            </strong>
          </article>


          <article className="graphical-stat-card">
            <span>
              Variance
            </span>

            <strong>
              {
                graphicalResult
                  .variance
                  .toFixed(4)
              }
            </strong>
          </article>


          <article className="graphical-stat-card">
            <span>
              Minimum
            </span>

            <strong>
              {
                graphicalResult
                  .minimum
                  .toFixed(3)
              }
            </strong>
          </article>


          <article className="graphical-stat-card">
            <span>
              Maximum
            </span>

            <strong>
              {
                graphicalResult
                  .maximum
                  .toFixed(3)
              }
            </strong>
          </article>


          <article className="graphical-stat-card">
            <span>
              Range
            </span>

            <strong>
              {
                graphicalResult
                  .range
                  .toFixed(3)
              }
            </strong>
          </article>


          <article className="graphical-stat-card">
            <span>
              Sample Size
            </span>

            <strong>
              {
                graphicalResult
                  .validValues
              }
            </strong>
          </article>

        </div>
        {/* Histogram */}

<div className="histogram-section">
  <div className="histogram-heading">
    <div>
      <h2>
        Histogram
      </h2>

      <p>
        Frequency distribution
        of{" "}
        <strong>
          {
            graphicalResult
              .variableName
          }
        </strong>
      </p>
    </div>

    <div className="histogram-mean">
      Mean:{" "}
      <strong>
        {
          graphicalResult
            .mean
            .toFixed(3)
        }
      </strong>
    </div>
  </div>


  <div className="histogram-chart">
    {
      createHistogram(
        graphicalResult
          .values,
      ).map(
        (
          bin,
          index,
        ) => {
          const histogram =
            createHistogram(
              graphicalResult
                .values,
            );

          const maximumCount =
            Math.max(
              ...histogram.map(
                (
                  histogramBin,
                ) =>
                  histogramBin
                    .count,
              ),
            );


          const barHeight =
            maximumCount ===
            0
              ? 0
              : (
                  bin.count /
                  maximumCount
                ) *
                100;


          return (
            <div
              className="histogram-column"
              key={
                `${bin.start}-${index}`
              }
            >
              <div className="histogram-count">
                {
                  bin.count
                }
              </div>


              <div className="histogram-bar-area">
                <div
                  className="histogram-bar"
                  style={{
                    height:
                      `${barHeight}%`,
                  }}
                />
              </div>


              <span>
                {
                  bin.start
                    .toFixed(
                      2,
                    )
                }
              </span>
            </div>
          );
        },
      )
    }
  </div>


  <div className="histogram-axis-title">
    {
      graphicalResult
        .variableName
    }
  </div>
</div>

    
    {/* Box plot */}

<div className="boxplot-section">
  <div className="boxplot-heading">
    <div>
      <h2>
        Box Plot
      </h2>

      <p>
        Distribution and
        quartile spread of{" "}
        <strong>
          {
            graphicalResult
              .variableName
          }
        </strong>
      </p>
    </div>

    <div className="boxplot-iqr-badge">
      IQR:{" "}
      <strong>
        {
          graphicalResult
            .interquartileRange
            .toFixed(3)
        }
      </strong>
    </div>
  </div>


  {/* Five-number summary */}

  <div className="boxplot-value-grid">
    <div>
      <span>
        Minimum
      </span>

      <strong>
        {
          graphicalResult
            .minimum
            .toFixed(3)
        }
      </strong>
    </div>


    <div>
      <span>
        Q1
      </span>

      <strong>
        {
          graphicalResult
            .firstQuartile
            .toFixed(3)
        }
      </strong>
    </div>


    <div>
      <span>
        Median
      </span>

      <strong>
        {
          graphicalResult
            .median
            .toFixed(3)
        }
      </strong>
    </div>


    <div>
      <span>
        Q3
      </span>

      <strong>
        {
          graphicalResult
            .thirdQuartile
            .toFixed(3)
        }
      </strong>
    </div>


    <div>
      <span>
        Maximum
      </span>

      <strong>
        {
          graphicalResult
            .maximum
            .toFixed(3)
        }
      </strong>
    </div>
  </div>


  {/* Visual box plot */}

  <div className="boxplot-chart">
    <div className="boxplot-line">
      <div className="boxplot-minimum-cap" />

      <div className="boxplot-left-whisker" />

      <div className="boxplot-box">
        <div className="boxplot-median-line" />
      </div>

      <div className="boxplot-right-whisker" />

      <div className="boxplot-maximum-cap" />
    </div>
  </div>


  <div className="boxplot-variable-name">
    {
      graphicalResult
        .variableName
    }
  </div>
</div>


{/* Normal Probability Plot */}

<section className="qq-plot-section">
  <div className="qq-plot-header">
    <div>
      <h2>
        Normal Probability Plot
      </h2>

      <p>
        Compare the observed values with
        theoretical normal-distribution
        quantiles.
      </p>
    </div>

    <div
      className={
        graphicalResult
          .isNormallyDistributed
          ? "qq-status qq-status-normal"
          : "qq-status qq-status-not-normal"
      }
    >
      {graphicalResult
        .isNormallyDistributed
        ? "Normal"
        : "Not Normal"}
    </div>
  </div>

  <div className="qq-plot-layout">
    {/* Graph */}

    <div className="qq-chart-container">
      <svg
        className="qq-chart"
        viewBox="0 0 720 500"
        role="img"
        aria-label={`Normal probability plot for ${graphicalResult.variableName}`}
      >
        {(() => {
          const chartLeft = 90;

          const chartRight = 670;

          const chartTop = 45;

          const chartBottom = 410;

          const theoreticalValues =
            graphicalResult.qqPlotPoints.map(
              (point) =>
                point.theoretical,
            );

          const actualValues =
            graphicalResult.qqPlotPoints.map(
              (point) =>
                point.actual,
            );

          const minimumX =
            Math.min(
              ...theoreticalValues,
            );

          const maximumX =
            Math.max(
              ...theoreticalValues,
            );

          const minimumActual =
            Math.min(
              ...actualValues,
              graphicalResult
                .qqReferenceStart.y,
              graphicalResult
                .qqReferenceEnd.y,
            );

          const maximumActual =
            Math.max(
              ...actualValues,
              graphicalResult
                .qqReferenceStart.y,
              graphicalResult
                .qqReferenceEnd.y,
            );

          const yPadding =
            Math.max(
              (
                maximumActual -
                minimumActual
              ) *
                0.08,
              0.001,
            );

          const minimumY =
            minimumActual -
            yPadding;

          const maximumY =
            maximumActual +
            yPadding;

          const scaleX = (
            value: number,
          ) =>
            chartLeft +
            (
              (
                value -
                minimumX
              ) /
              (
                maximumX -
                minimumX ||
                1
              )
            ) *
              (
                chartRight -
                chartLeft
              );

          const scaleY = (
            value: number,
          ) =>
            chartBottom -
            (
              (
                value -
                minimumY
              ) /
              (
                maximumY -
                minimumY ||
                1
              )
            ) *
              (
                chartBottom -
                chartTop
              );

          const xTicks =
            Array.from(
              {
                length: 5,
              },
              (
                _,
                index,
              ) =>
                minimumX +
                (
                  (
                    maximumX -
                    minimumX
                  ) *
                  index
                ) /
                  4,
            );

          const yTicks =
            Array.from(
              {
                length: 5,
              },
              (
                _,
                index,
              ) =>
                minimumY +
                (
                  (
                    maximumY -
                    minimumY
                  ) *
                  index
                ) /
                  4,
            );

          return (
            <>
              {/* Grid lines */}

              {xTicks.map(
                (
                  tick,
                  index,
                ) => (
                  <g
                    key={`x-${index}`}
                  >
                    <line
                      x1={scaleX(
                        tick,
                      )}
                      y1={
                        chartTop
                      }
                      x2={scaleX(
                        tick,
                      )}
                      y2={
                        chartBottom
                      }
                      className="qq-grid-line"
                    />

                    <text
                      x={scaleX(
                        tick,
                      )}
                      y={
                        chartBottom +
                        30
                      }
                      textAnchor="middle"
                      className="qq-axis-value"
                    >
                      {tick.toFixed(
                        1,
                      )}
                    </text>
                  </g>
                ),
              )}

              {yTicks.map(
                (
                  tick,
                  index,
                ) => (
                  <g
                    key={`y-${index}`}
                  >
                    <line
                      x1={
                        chartLeft
                      }
                      y1={scaleY(
                        tick,
                      )}
                      x2={
                        chartRight
                      }
                      y2={scaleY(
                        tick,
                      )}
                      className="qq-grid-line"
                    />

                    <text
                      x={
                        chartLeft -
                        16
                      }
                      y={
                        scaleY(
                          tick,
                        ) + 5
                      }
                      textAnchor="end"
                      className="qq-axis-value"
                    >
                      {tick.toFixed(
                        3,
                      )}
                    </text>
                  </g>
                ),
              )}

              {/* X and Y axes */}

              <line
                x1={chartLeft}
                y1={
                  chartBottom
                }
                x2={
                  chartRight
                }
                y2={
                  chartBottom
                }
                className="qq-axis-line"
              />

              <line
                x1={chartLeft}
                y1={chartTop}
                x2={chartLeft}
                y2={
                  chartBottom
                }
                className="qq-axis-line"
              />

              {/* Reference line */}

              <line
                x1={scaleX(
                  graphicalResult
                    .qqReferenceStart
                    .x,
                )}
                y1={scaleY(
                  graphicalResult
                    .qqReferenceStart
                    .y,
                )}
                x2={scaleX(
                  graphicalResult
                    .qqReferenceEnd
                    .x,
                )}
                y2={scaleY(
                  graphicalResult
                    .qqReferenceEnd
                    .y,
                )}
                className="qq-reference-line"
              />

              {/* Actual data points */}

              {graphicalResult
                .qqPlotPoints
                .map(
                  (
                    point,
                    index,
                  ) => (
                    <circle
                      key={
                        index
                      }
                      cx={scaleX(
                        point
                          .theoretical,
                      )}
                      cy={scaleY(
                        point
                          .actual,
                      )}
                      r="6"
                      className="qq-data-point"
                    >
                      <title>
                        {`Theoretical: ${point.theoretical.toFixed(
                          3,
                        )}, Actual: ${point.actual.toFixed(
                          3,
                        )}`}
                      </title>
                    </circle>
                  ),
                )}

              {/* Axis titles */}

              <text
                x={
                  (
                    chartLeft +
                    chartRight
                  ) /
                  2
                }
                y="485"
                textAnchor="middle"
                className="qq-axis-title"
              >
                Theoretical Normal
                Quantiles
              </text>

              <text
                x="25"
                y={
                  (
                    chartTop +
                    chartBottom
                  ) /
                  2
                }
                textAnchor="middle"
                transform={`rotate(-90 25 ${
                  (
                    chartTop +
                    chartBottom
                  ) /
                  2
                })`}
                className="qq-axis-title"
              >
                Observed Values
              </text>
            </>
          );
        })()}
      </svg>
    </div>

    {/* Q-Q plot information */}

    <aside className="qq-information-card">
      <h3>
        Probability Plot Summary
      </h3>

      <div className="qq-information-row">
        <span>
          Variable
        </span>

        <strong>
          {
            graphicalResult
              .variableName
          }
        </strong>
      </div>

      <div className="qq-information-row">
        <span>
          Observations
        </span>

        <strong>
          {
            graphicalResult
              .validValues
          }
        </strong>
      </div>

      <div className="qq-information-row">
        <span>
          R²
        </span>

        <strong>
          {
            graphicalResult
              .qqRSquared
              .toFixed(4)
          }
        </strong>
      </div>

      <div className="qq-information-row">
        <span>
          P-Value
        </span>

        <strong>
          {
            graphicalResult
              .normalityPValue <
            0.0001
              ? "< 0.0001"
              : graphicalResult
                  .normalityPValue
                  .toFixed(4)
          }
        </strong>
      </div>

      <div className="qq-legend">
        <div>
          <span className="qq-point-symbol" />

          Observed data
        </div>

        <div>
          <span className="qq-line-symbol" />

          Normal reference line
        </div>
      </div>

      <div
        className={
          graphicalResult
            .isNormallyDistributed
            ? "qq-conclusion qq-conclusion-normal"
            : "qq-conclusion qq-conclusion-not-normal"
        }
      >
        <strong>
          Visual Interpretation
        </strong>

        <p>
          {graphicalResult
            .isNormallyDistributed
            ? "The observations remain reasonably close to the reference line, supporting an approximately normal distribution."
            : "The observations show noticeable departures from the reference line, indicating possible non-normality."}
        </p>
      </div>
    </aside>
  </div>
</section>


{/* Normality test */}

<div className="normality-section">
  <div className="normality-heading">
    <div>
      <h2>
        Normality Test
      </h2>

      <p>
        Jarque–Bera normality
        assessment for{" "}
        <strong>
          {
            graphicalResult
              .variableName
          }
        </strong>
      </p>
    </div>

    <div
      className={
        graphicalResult
          .isNormallyDistributed
          ? "normality-status normality-pass"
          : "normality-status normality-fail"
      }
    >
      {
        graphicalResult
          .isNormallyDistributed
          ? "Approximately Normal"
          : "Not Normal"
      }
    </div>
  </div>


  <div className="normality-result-grid">
    <article>
      <span>
        Jarque–Bera
        Statistic
      </span>

      <strong>
        {
          graphicalResult
            .jarqueBeraStatistic
            .toFixed(4)
        }
      </strong>
    </article>


    <article>
      <span>
        P-Value
      </span>

      <strong>
        {
          graphicalResult
            .normalityPValue <
          0.0001
            ? "< 0.0001"
            : graphicalResult
                .normalityPValue
                .toFixed(4)
        }
      </strong>
    </article>


    <article>
      <span>
        Skewness
      </span>

      <strong>
        {
          graphicalResult
            .skewness
            .toFixed(4)
        }
      </strong>
    </article>


    <article>
      <span>
        Kurtosis
      </span>

      <strong>
        {
          graphicalResult
            .kurtosis
            .toFixed(4)
        }
      </strong>
    </article>
  </div>


  <div className="normality-hypothesis">
    <div>
      <strong>
        H₀
      </strong>

      <span>
        The data follows a
        normal distribution.
      </span>
    </div>

    <div>
      <strong>
        H₁
      </strong>

      <span>
        The data does not
        follow a normal
        distribution.
      </span>
    </div>
  </div>


  <div
    className={
      graphicalResult
        .isNormallyDistributed
        ? "normality-decision normality-decision-pass"
        : "normality-decision normality-decision-fail"
    }
  >
    <h3>
      Statistical Decision
    </h3>

    <p>
      {
        graphicalResult
          .isNormallyDistributed
          ? "Since the p-value is greater than or equal to 0.05, there is insufficient evidence to reject the null hypothesis. The data may be treated as approximately normal."
          : "Since the p-value is less than 0.05, reject the null hypothesis. The data provides evidence of a departure from normality."
      }
    </p>
  </div>
</div>


{/* Automatic interpretation */}

<div className="interpretation-section">
  <div className="interpretation-heading">
    <div className="interpretation-icon">
      <BarChart3
        size={24}
      />
    </div>

    <div>
      <h2>
        Statistical
        Interpretation
      </h2>

      <p>
        Automatically generated
        analysis summary
      </p>
    </div>
  </div>

  <div className="interpretation-content">
    {
      graphicalResult
        .interpretation
    }
  </div>
</div>







      </section>
    )
    : (
        
        
              <section className="graphical-empty-card">
                <div className="graphical-empty-icon">
                  <BarChart3
                    size={
                      48
                    }
                  />
                </div>


                <h2>
                  No Analysis
                  Results
                </h2>


                <p>
                  Select a dataset
                  and numeric
                  variable, then
                  click “Generate
                  Graphical
                  Summary”.
                </p>
              </section>
            )
        }
      </main>
    </div>
  );
}


export default GraphicalSummary;