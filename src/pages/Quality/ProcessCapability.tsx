import {
  BarChart3,
  CheckCircle2,
  Database,
  Gauge,
  Target,
  TrendingUp,
} from "lucide-react";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  useEffect,
  useState,
} from "react";

import * as XLSX from "xlsx";

import { supabase } from "../../lib/supabase";

import Sidebar from "../../components/layout/Sidebar";
import Header from "../../components/layout/Header";

import "./ProcessCapability.css";


type Dataset = {
  id: number | string;

  dataset_name: string | null;

  file_name: string | null;

  file_path: string | null;

  sheet_name?: string | null;
};

type CapabilityResults = {
  mean: number;

  standardDeviation: number;

  cp: number;

  cpk: number;

  pp: number;

  ppk: number;

  sigmaLevel: number;

  sampleSize: number;

  ppmLow: number;

  ppmHigh: number;

  ppmTotal: number;

  estimatedYield: number;

  minimum: number;

  maximum: number;

  classification:
    | "Excellent"
    | "Adequate"
    | "Marginal"
    | "Inadequate";
};


function ProcessCapability() {
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


  /* Selected numeric column */

  const [
    selectedColumn,
    setSelectedColumn,
  ] = useState("");


  /* Dataset values */

  const [
    datasetRows,
    setDatasetRows,
  ] = useState<
    Record<string, unknown>[]
  >([]);


  /* Numeric columns */

  const [
    numericColumns,
    setNumericColumns,
  ] = useState<string[]>([]);


  /* Specification limits */

  const [
    lowerSpecLimit,
    setLowerSpecLimit,
  ] = useState("");


  const [
    upperSpecLimit,
    setUpperSpecLimit,
  ] = useState("");


  const [
    targetValue,
    setTargetValue,
  ] = useState("");


  /* Loading states */

  const [
    loadingDatasets,
    setLoadingDatasets,
  ] = useState(true);


  const [
    loadingFile,
    setLoadingFile,
  ] = useState(false);


  /* Error */

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");


  /* Results */

  const [
    analysisGenerated,
    setAnalysisGenerated,
  ] = useState(false);

  const [
  capabilityResults,
  setCapabilityResults,
] =
  useState<CapabilityResults | null>(
    null,
  );


  /*
  Load uploaded datasets
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
        } =
          await supabase
            .from(
              "datasets",
            )
            .select(
              `
              id,
              dataset_name,
              file_name,
              file_path,
              sheet_name
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
          (data ??
            []) as Dataset[],
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
  page opens
  */

  useEffect(() => {
    void loadDatasets();
  }, []);


  /*
  Open selected Excel file
  */

  const handleDatasetChange =
    async (
      datasetId: string,
    ) => {
      setSelectedDatasetId(
        datasetId,
      );


      setSelectedColumn("");

      setDatasetRows([]);

      setNumericColumns([]);

      setAnalysisGenerated(
        false,
      );

      setErrorMessage("");


      if (!datasetId) {
        return;
      }


      const selectedDataset =
        datasets.find(
          (dataset) =>
            String(
              dataset.id,
            ) ===
            datasetId,
        );


      if (!selectedDataset) {
        setErrorMessage(
          "The selected dataset could not be found.",
        );

        return;
      }


      /*
      Supports either
      file_path or storage_path
      */

      const datasetPath =
        selectedDataset.file_path;


      if (!datasetPath) {
        setErrorMessage(
          "The selected dataset does not have a valid storage path.",
        );

        return;
      }


      try {
        setLoadingFile(
          true,
        );


        /*
        Use the same bucket
        used in the working
        Descriptive Statistics page
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
              datasetPath,
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
            "The downloaded dataset is empty.",
          );
        }


        const arrayBuffer =
          await downloadedFile
            .arrayBuffer();


        const workbook =
          XLSX.read(
            arrayBuffer,
            {
              type:
                "array",
            },
          );


        const savedSheet =
          selectedDataset
            .sheet_name;


        const worksheetName =
          savedSheet &&
          workbook
            .SheetNames
            .includes(
              savedSheet,
            )
            ? savedSheet
            : workbook
                .SheetNames[0];


        if (
          !worksheetName
        ) {
          throw new Error(
            "No worksheet was found.",
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
            "The selected worksheet is empty.",
          );
        }


        /*
        Detect numeric columns
        */

        const columns =
          Object.keys(
            rows[0],
          );


        const detectedColumns =
          columns.filter(
            (
              column,
            ) => {
              const values =
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
                values.length ===
                0
              ) {
                return false;
              }


              const numericValues =
                values.filter(
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
                  values
                    .length >=
                0.8
              );
            },
          );


        setDatasetRows(
          rows,
        );


        setNumericColumns(
          detectedColumns,
        );


        if (
          detectedColumns
            .length ===
          0
        ) {
          setErrorMessage(
            "No numeric columns were detected.",
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
            : "Unable to open the dataset.",
        );
      } finally {
        setLoadingFile(
          false,
        );
      }
    };


  /*
Approximation of the
standard normal cumulative
distribution function.
*/

const normalCdf = (
  value: number,
) => {
  const absoluteValue =
    Math.abs(value);

  const temporaryValue =
    1 /
    (
      1 +
      0.2316419 *
        absoluteValue
    );

  const density =
    0.3989422804014327 *
    Math.exp(
      -0.5 *
        absoluteValue *
        absoluteValue,
    );

  const probability =
    1 -
    density *
      temporaryValue *
      (
        0.31938153 +
        temporaryValue *
          (
            -0.356563782 +
            temporaryValue *
              (
                1.781477937 +
                temporaryValue *
                  (
                    -1.821255978 +
                    temporaryValue *
                      1.330274429
                  )
              )
          )
      );

  return value >= 0
    ? probability
    : 1 - probability;
};


/*
Calculate sample
standard deviation.
*/

const calculateSampleStandardDeviation =
  (
    values: number[],
    mean: number,
  ) => {
    if (
      values.length <
      2
    ) {
      return 0;
    }

    const squaredDifferences =
      values.reduce(
        (
          total,
          value,
        ) => {
          const difference =
            value -
            mean;

          return (
            total +
            difference *
              difference
          );
        },
        0,
      );

    return Math.sqrt(
      squaredDifferences /
        (
          values.length -
          1
        ),
    );
  };

  const handleCalculate =
  async () => {
    setErrorMessage("");

    setCapabilityResults(
      null,
    );


    /* Validate dataset */

    if (
      !selectedDatasetId
    ) {
      setErrorMessage(
        "Select a dataset.",
      );

      return;
    }


    /* Validate column */

    if (
      !selectedColumn
    ) {
      setErrorMessage(
        "Select a numeric column.",
      );

      return;
    }


    /* Validate specification limits */

    if (
      lowerSpecLimit === "" ||
      upperSpecLimit === ""
    ) {
      setErrorMessage(
        "Enter both specification limits.",
      );

      return;
    }


    const lsl =
      Number(
        lowerSpecLimit,
      );


    const usl =
      Number(
        upperSpecLimit,
      );


    if (
      !Number.isFinite(
        lsl,
      ) ||
      !Number.isFinite(
        usl,
      )
    ) {
      setErrorMessage(
        "Enter valid specification limits.",
      );

      return;
    }


    if (
      lsl >= usl
    ) {
      setErrorMessage(
        "The upper specification limit must be greater than the lower specification limit.",
      );

      return;
    }


    /* Extract numeric values */

    const values =
      datasetRows
        .map(
          (row) =>
            Number(
              row[
                selectedColumn
              ],
            ),
        )
        .filter(
          (value) =>
            Number.isFinite(
              value,
            ),
        );


    if (
      values.length < 2
    ) {
      setErrorMessage(
        "At least two valid numeric observations are required.",
      );

      return;
    }


    /* Calculate mean */

    const mean =
      values.reduce(
        (
          total,
          value,
        ) =>
          total +
          value,
        0,
      ) /
      values.length;


    /* Calculate standard deviation */

    const standardDeviation =
      calculateSampleStandardDeviation(
        values,
        mean,
      );


    if (
      standardDeviation <= 0 ||
      !Number.isFinite(
        standardDeviation,
      )
    ) {
      setErrorMessage(
        "Capability cannot be calculated because the selected column has no measurable variation.",
      );

      return;
    }


    /* Calculate capability indices */

    const cp =
      (
        usl -
        lsl
      ) /
      (
        6 *
        standardDeviation
      );


    const cpu =
      (
        usl -
        mean
      ) /
      (
        3 *
        standardDeviation
      );


    const cpl =
      (
        mean -
        lsl
      ) /
      (
        3 *
        standardDeviation
      );


    const cpk =
      Math.min(
        cpu,
        cpl,
      );


    const pp =
      cp;


    const ppk =
      cpk;


    /* Calculate process sigma */

    const sigmaLevel =
      Math.max(
        0,
        cpk * 3,
      );


    /* Estimate defect rates */

    const lowerZ =
      (
        lsl -
        mean
      ) /
      standardDeviation;


    const upperZ =
      (
        usl -
        mean
      ) /
      standardDeviation;


    const lowerProbability =
      normalCdf(
        lowerZ,
      );


    const upperProbability =
      1 -
      normalCdf(
        upperZ,
      );


    const ppmLow =
      Math.max(
        0,
        lowerProbability *
          1_000_000,
      );


    const ppmHigh =
      Math.max(
        0,
        upperProbability *
          1_000_000,
      );


    const ppmTotal =
      Math.min(
        1_000_000,
        ppmLow +
          ppmHigh,
      );


    const estimatedYield =
      Math.max(
        0,
        100 -
          ppmTotal /
            10_000,
      );


    /* Capability classification */

    let classification:
      CapabilityResults[
        "classification"
      ];


    if (
      cpk >= 1.67
    ) {
      classification =
        "Excellent";

    } else if (
      cpk >= 1.33
    ) {
      classification =
        "Adequate";

    } else if (
      cpk >= 1
    ) {
      classification =
        "Marginal";

    } else {
      classification =
        "Inadequate";
    }


    /* Display capability results */

    setCapabilityResults({
      mean,

      standardDeviation,

      cp,

      cpk,

      pp,

      ppk,

      sigmaLevel,

      sampleSize:
        values.length,

      ppmLow,

      ppmHigh,

      ppmTotal,

      estimatedYield,

      minimum:
        Math.min(
          ...values,
        ),

      maximum:
        Math.max(
          ...values,
        ),

      classification,
    });


    setAnalysisGenerated(
      true,
    );


    /* Find selected dataset */

    const selectedDataset =
      datasets.find(
        (dataset) =>
          String(
            dataset.id,
          ) ===
          selectedDatasetId,
      );


    /* Save analysis in Supabase */

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
            "process_capability",

          dataset_id:
            selectedDatasetId,

          dataset_name:
            selectedDataset
              ?.dataset_name ??
            selectedDataset
              ?.file_name ??
            "Untitled Dataset",

          result_value:
            cpk,

          classification:
            classification
              .toLowerCase(),
        });


    if (
      analysisHistoryError
    ) {
      console.error(
        "Unable to save analysis history:",
        analysisHistoryError,
      );
    }
  };

  const processHistogramData = (() => {
  if (
  !capabilityResults ||
  !selectedColumn ||
  datasetRows.length === 0
) {
  return [];
}

  const values =
  datasetRows
    .map((row) =>
      Number(
        row[selectedColumn],
      ),
    )
    .filter(
      (value) =>
        Number.isFinite(
          value,
        ),
    );

  const minimum =
    Math.min(...values);

  const maximum =
    Math.max(...values);

  const sampleSize =
    values.length;

  const numberOfBins =
    Math.max(
      5,
      Math.ceil(
        Math.sqrt(sampleSize),
      ),
    );

  const dataRange =
    maximum - minimum;

  const binWidth =
    dataRange === 0
      ? 1
      : dataRange /
        numberOfBins;

  const standardDeviation =
    capabilityResults
      .standardDeviation;

  return Array.from(
    {
      length: numberOfBins,
    },
    (_, index) => {
      const binStart =
        minimum +
        index *
          binWidth;

      const binEnd =
        index ===
        numberOfBins - 1
          ? maximum
          : binStart +
            binWidth;

      const binCenter =
        (
          binStart +
          binEnd
        ) /
        2;

      const frequency =
        values.filter(
          (value) => {
            if (
              index ===
              numberOfBins - 1
            ) {
              return (
                value >=
                  binStart &&
                value <=
                  binEnd
              );
            }

            return (
              value >=
                binStart &&
              value <
                binEnd
            );
          },
        ).length;

      let normalCurve = 0;

      if (
        standardDeviation > 0
      ) {
        const zValue =
          (
            binCenter -
            capabilityResults.mean
          ) /
          standardDeviation;

        const density =
          Math.exp(
            -0.5 *
              zValue *
              zValue,
          ) /
          (
            standardDeviation *
            Math.sqrt(
              2 *
                Math.PI,
            )
          );

        normalCurve =
          density *
          sampleSize *
          binWidth;
      }

      return {
        binCenter:
          Number(
            binCenter.toFixed(
              6,
            ),
          ),

        frequency,

        normalCurve:
          Number(
            normalCurve.toFixed(
              4,
            ),
          ),
      };
    },
  );
})();


  return (
    <div className="capability-page">
      <Sidebar />

      <Header />


      <main className="capability-content">

        {/* Heading */}

        <section className="capability-heading">

          <h1>
            Process Capability
            Analysis
          </h1>

          <p>
            Evaluate process
            performance using Cp,
            Cpk, Pp, Ppk and
            specification limits.
          </p>

        </section>


        {/* Configuration */}

        <section className="capability-configuration-card">

          <div className="capability-card-heading">

            <div className="capability-heading-icon">

              <Gauge
                size={25}
              />

            </div>


            <div>

              <h2>
                Analysis
                Configuration
              </h2>

              <p>
                Select process data
                and enter the
                specification
                requirements.
              </p>

            </div>

          </div>


          <div className="capability-selection-grid">

            {/* Dataset */}

            <div className="capability-input-group">

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


            {/* Numeric column */}

            <div className="capability-input-group">

              <label>
                Select Numeric
                Column
              </label>


              <select
                value={
                  selectedColumn
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

                  setSelectedColumn(
                    event
                      .target
                      .value,
                  );

                  setAnalysisGenerated(
                    false,
                  );

                }}
              >

                <option value="">

                  {
                    loadingFile
                      ? "Reading file..."
                      : "Choose a numeric column"
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

            </div>

          </div>


          {/* Limits */}

          <div className="specification-heading">

            <Target
              size={21}
            />

            <div>

              <h3>
                Specification
                Limits
              </h3>

              <p>
                Enter the approved
                engineering limits
                for the selected
                characteristic.
              </p>

            </div>

          </div>


          <div className="specification-grid">

            <div className="capability-input-group">

              <label>
                Lower Specification
                Limit — LSL
              </label>


              <input
                type="number"

                value={
                  lowerSpecLimit
                }

                placeholder="Example: 17"

                onChange={(
                  event,
                ) => {

                  setLowerSpecLimit(
                    event
                      .target
                      .value,
                  );

                  setAnalysisGenerated(
                    false,
                  );

                }}
              />

            </div>


            <div className="capability-input-group">

              <label>
                Upper Specification
                Limit — USL
              </label>


              <input
                type="number"

                value={
                  upperSpecLimit
                }

                placeholder="Example: 18"

                onChange={(
                  event,
                ) => {

                  setUpperSpecLimit(
                    event
                      .target
                      .value,
                  );

                  setAnalysisGenerated(
                    false,
                  );

                }}
              />

            </div>


            <div className="capability-input-group">

              <label>
                Target Value
                (Optional)
              </label>


              <input
                type="number"

                value={
                  targetValue
                }

                placeholder="Optional"

                onChange={(
                  event,
                ) =>
                  setTargetValue(
                    event
                      .target
                      .value,
                  )
                }
              />

            </div>

          </div>


          <button
            type="button"

            className="calculate-capability-button"

            disabled={
              !selectedDatasetId ||
              !selectedColumn ||
              datasetRows
                .length ===
                0 ||
              lowerSpecLimit ===
                "" ||
              upperSpecLimit ===
                ""
            }

            onClick={
              handleCalculate
            }
          >

            <BarChart3
              size={21}
            />

            Calculate Process
            Capability

          </button>


          {
            errorMessage && (

              <div className="capability-error-message">

                {
                  errorMessage
                }

              </div>

            )
          }

        </section>


        {/* Empty result */}

        {
          !analysisGenerated && (

            <section className="capability-empty-card">

              <div className="capability-empty-icon">

                <Database
                  size={50}
                />

              </div>


              <h2>
                No Capability
                Results
              </h2>


              <p>
                Select a dataset,
                numeric column and
                specification limits,
                then calculate process
                capability.
              </p>

            </section>

          )
        }


        {/* Process Capability Results */}

{analysisGenerated &&
  capabilityResults && (
    <section className="capability-results-section">

      {/* Overall capability status */}

      <article
        className={`capability-status-card ${capabilityResults.classification.toLowerCase()}`}
      >
        <div className="capability-status-icon">
          <CheckCircle2
            size={40}
          />
        </div>

        <div>
          <span>
            PROCESS CAPABILITY
            ASSESSMENT
          </span>

          <h2>
            Process Capability:{" "}
            {
              capabilityResults.classification
            }
          </h2>

          <p>
            Cpk ={" "}
            <strong>
              {
                capabilityResults.cpk.toFixed(
                  3,
                )
              }
            </strong>

            {" · "}

            Process Sigma Level ={" "}

            <strong>
              {
                capabilityResults.sigmaLevel.toFixed(
                  2,
                )
              }
              σ
            </strong>
          </p>
        </div>
      </article>


      {/* Main result layout */}

      <div className="capability-results-grid">

        {/* Left side */}

        <div className="capability-results-left">

          {/* Graph placeholder */}

          <article className="capability-result-card process-chart-card">

            <div className="result-card-title">

              <div>

                <h2>
                  Process Distribution
                </h2>

                <p>
                  Distribution relative
                  to specification limits
                </p>

              </div>

              <div className="result-title-icon">

                <BarChart3
                  size={24}
                />

              </div>

            </div>


            <div className="process-distribution-chart">

  <ResponsiveContainer
    width="100%"
    height="100%"
  >

    <ComposedChart
  data={processHistogramData}
  barCategoryGap={0}
  barGap={0}
  margin={{
    top: 45,
    right: 35,
    left: 10,
    bottom: 35,
  }}
>

      <CartesianGrid
        strokeDasharray="3 3"
        vertical={false}
      />

      <XAxis
  type="number"
  dataKey="binCenter"
  domain={[
    (
      dataMin: number,
    ) =>
      dataMin -
      (
        processHistogramData.length >
        1
          ? (
              processHistogramData[1]
                .binCenter -
              processHistogramData[0]
                .binCenter
            ) /
            2
          : 0.5
      ),

    (
      dataMax: number,
    ) =>
      dataMax +
      (
        processHistogramData.length >
        1
          ? (
              processHistogramData[1]
                .binCenter -
              processHistogramData[0]
                .binCenter
            ) /
            2
          : 0.5
      ),
  ]}
        tickFormatter={(
          value: number,
        ) =>
          value.toFixed(3)
        }
        label={{
          value:
            selectedColumn,

          position:
            "insideBottom",

          offset: -22,
        }}
      />

      <YAxis
        allowDecimals={false}
        width={55}
        label={{
          value:
            "Frequency",

          angle: -90,

          position:
            "insideLeft",
        }}
      />

      <Tooltip
  formatter={(
    value,
    name,
  ) => {

    const numericValue =
      Number(
        value ?? 0,
      );

    if (
      String(name) ===
      "Frequency"
    ) {
      return [
        numericValue.toFixed(
          0,
        ),
        "Frequency",
      ];
    }

    return [
      numericValue.toFixed(
        3,
      ),
      "Normal Curve",
    ];
  }}
/>

      <Legend
        verticalAlign="top"
        align="center"
        height={38}
      />


      {/* LOWER SPECIFICATION LIMIT */}

      <ReferenceLine
        x={
          Number(
            lowerSpecLimit,
          )
        }
        stroke="#dc2626"
        strokeWidth={2}
        strokeDasharray="7 5"
        label={{
          value:
            `LSL ${Number(
              lowerSpecLimit,
            ).toFixed(3)}`,

          position:
            "insideTopLeft",
        }}
      />


      {/* PROCESS MEAN */}

      <ReferenceLine
        x={
          capabilityResults
            .mean
        }
        stroke="#111827"
        strokeWidth={2}
        strokeDasharray="7 5"
        label={{
          value:
            `Mean ${capabilityResults.mean.toFixed(
              3,
            )}`,

          position:
            "insideTopRight",
        }}
      />


      {/* UPPER SPECIFICATION LIMIT */}

      <ReferenceLine
        x={
          Number(
            upperSpecLimit,
          )
        }
        stroke="#dc2626"
        strokeWidth={2}
        strokeDasharray="7 5"
        label={{
          value:
            `USL ${Number(
              upperSpecLimit,
            ).toFixed(3)}`,

          position:
            "insideTopRight",
        }}
      />


      {/* HISTOGRAM */}

      <Bar
        dataKey="frequency"
        name="Frequency"
        fill="#2f80b7"
        stroke="#1e5f8a"
        
      />


      {/* NORMAL DISTRIBUTION CURVE */}

      <Line
        type="monotone"
        dataKey="normalCurve"
        name="Normal Curve"
        stroke="#f97316"
        strokeWidth={3}
        dot={false}
        activeDot={{
          r: 5,
        }}
      />

    </ComposedChart>

  </ResponsiveContainer>

</div>

          </article>


          {/* Process statistics */}

          <article className="capability-result-card">

            <div className="result-card-title">

              <div>

                <h2>
                  Process Statistics
                </h2>

                <p>
                  Summary of the
                  selected process
                  characteristic
                </p>

              </div>

            </div>


            <div className="process-statistics-grid">

              <div>

                <span>
                  Mean
                </span>

                <strong>
                  {
                    capabilityResults.mean.toFixed(
                      4,
                    )
                  }
                </strong>

              </div>


              <div>

                <span>
                  Standard Deviation
                </span>

                <strong>
                  {
                    capabilityResults.standardDeviation.toFixed(
                      4,
                    )
                  }
                </strong>

              </div>


              <div>

                <span>
                  Sample Size
                </span>

                <strong>
                  {
                    capabilityResults.sampleSize
                  }
                </strong>

              </div>


              <div>

                <span>
                  Minimum
                </span>

                <strong>
                  {
                    capabilityResults.minimum.toFixed(
                      4,
                    )
                  }
                </strong>

              </div>


              <div>

                <span>
                  Maximum
                </span>

                <strong>
                  {
                    capabilityResults.maximum.toFixed(
                      4,
                    )
                  }
                </strong>

              </div>


              <div>

                <span>
                  Estimated PPM
                </span>

                <strong>
                  {
                    capabilityResults.ppmTotal.toFixed(
                      2,
                    )
                  }
                </strong>

              </div>

            </div>

          </article>

        </div>


        {/* Right side */}

        <div className="capability-results-right">

          {/* Capability indices */}

          <article className="capability-result-card">

            <div className="result-card-title">

              <div>

                <h2>
                  Capability Indices
                </h2>

                <p>
                  Potential and overall
                  process capability
                </p>

              </div>

              <div className="result-title-icon">

                <Gauge
                  size={24}
                />

              </div>

            </div>


            <div className="capability-indices-grid">

              <div className="capability-index-card cp-index">

                <span>
                  Cp
                </span>

                <small>
                  Potential Capability
                </small>

                <strong>
                  {
                    capabilityResults.cp.toFixed(
                      3,
                    )
                  }
                </strong>

              </div>


              <div className="capability-index-card cpk-index">

                <span>
                  Cpk
                </span>

                <small>
                  Actual Capability
                </small>

                <strong>
                  {
                    capabilityResults.cpk.toFixed(
                      3,
                    )
                  }
                </strong>

              </div>


              <div className="capability-index-card pp-index">

                <span>
                  Pp
                </span>

                <small>
                  Overall Performance
                </small>

                <strong>
                  {
                    capabilityResults.pp.toFixed(
                      3,
                    )
                  }
                </strong>

              </div>


              <div className="capability-index-card ppk-index">

                <span>
                  Ppk
                </span>

                <small>
                  Overall Performance
                  Index
                </small>

                <strong>
                  {
                    capabilityResults.ppk.toFixed(
                      3,
                    )
                  }
                </strong>

              </div>

            </div>

          </article>


          {/* Defect estimation */}

          <article className="capability-result-card">

            <div className="result-card-title">

              <div>

                <h2>
                  Estimated Performance
                </h2>

                <p>
                  Normal-distribution
                  defect estimates
                </p>

              </div>

              <div className="result-title-icon">

                <TrendingUp
                  size={24}
                />

              </div>

            </div>


            <div className="performance-results-grid">

              <div>

                <span>
                  Estimated Yield
                </span>

                <strong className="yield-value">
                  {
                    capabilityResults.estimatedYield.toFixed(
                      4,
                    )
                  }
                  %
                </strong>

              </div>


              <div>

                <span>
                  PPM Below LSL
                </span>

                <strong>
                  {
                    capabilityResults.ppmLow.toFixed(
                      2,
                    )
                  }
                </strong>

              </div>


              <div>

                <span>
                  PPM Above USL
                </span>

                <strong>
                  {
                    capabilityResults.ppmHigh.toFixed(
                      2,
                    )
                  }
                </strong>

              </div>


              <div>

                <span>
                  Total PPM
                </span>

                <strong>
                  {
                    capabilityResults.ppmTotal.toFixed(
                      2,
                    )
                  }
                </strong>

              </div>

            </div>

          </article>

        </div>

      </div>


      {/* Interpretation */}

      <article className="capability-interpretation-card">

        <div className="interpretation-heading">

          <div className="interpretation-icon">

            <Target
              size={25}
            />

          </div>

          <div>

            <h2>
              Capability
              Interpretation
            </h2>

            <p>
              Automatic process
              performance assessment
            </p>

          </div>

        </div>


        <div className="capability-benchmark-grid">

          <div className="excellent-benchmark">

            <span>
              Cpk ≥ 1.67
            </span>

            <strong>
              Excellent
            </strong>

          </div>


          <div className="adequate-benchmark">

            <span>
              Cpk ≥ 1.33
            </span>

            <strong>
              Adequate
            </strong>

          </div>


          <div className="marginal-benchmark">

            <span>
              Cpk ≥ 1.00
            </span>

            <strong>
              Marginal
            </strong>

          </div>


          <div className="inadequate-benchmark">

            <span>
              Cpk &lt; 1.00
            </span>

            <strong>
              Inadequate
            </strong>

          </div>

        </div>


        <div className="capability-assessment-box">

          <h3>
            Process Assessment
          </h3>


          <p>

            The calculated Cpk is{" "}

            <strong>
              {
                capabilityResults.cpk.toFixed(
                  3,
                )
              }
            </strong>

            , which classifies the
            process as{" "}

            <strong>
              {
                capabilityResults.classification.toLowerCase()
              }
            </strong>

            . The estimated process
            yield is{" "}

            <strong>
              {
                capabilityResults.estimatedYield.toFixed(
                  4,
                )
              }
              %
            </strong>

            , with approximately{" "}

            <strong>
              {
                capabilityResults.ppmTotal.toFixed(
                  2,
                )
              }
            </strong>

            {" "}nonconforming parts
            per million.

          </p>


          {capabilityResults.cpk >=
          1.67 ? (

            <p>
              The process demonstrates
              excellent capability and
              operates comfortably
              within the entered
              specification limits.
            </p>

          ) : capabilityResults.cpk >=
            1.33 ? (

            <p>
              The process is capable
              and generally satisfies
              normal manufacturing
              capability requirements.
            </p>

          ) : capabilityResults.cpk >=
            1 ? (

            <p>
              The process is marginally
              capable. Variation
              reduction and improved
              process centering are
              recommended.
            </p>

          ) : (

            <p>
              The process is currently
              incapable of consistently
              meeting the entered
              specification limits.
              Corrective action should
              be considered.
            </p>

          )}

        </div>

      </article>

    </section>
  )
}

      </main>

    </div>
  );
}


export default ProcessCapability;