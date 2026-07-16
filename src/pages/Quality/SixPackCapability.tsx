import {
  Activity,
  BarChart3,
  CheckCircle2,
  Layers3,
  LineChart,
  Target,
  TrendingUp,
} from "lucide-react";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart as RechartsLineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
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

import "./CapabilitySixPack.css";


/* ==========================================
   DATASET TYPE
========================================== */

type Dataset = {
  id: number | string;

  dataset_name: string | null;

  file_name: string | null;

  file_path: string | null;

  storage_path?: string | null;

  sheet_name: string | null;
};


/* ==========================================
   SUBGROUP TYPE
========================================== */

type SubgroupResult = {
  subgroupNumber: number;

  values: number[];

  mean: number;

  range: number;
};


/* ==========================================
   SIX-PACK RESULT TYPE
========================================== */

type SixPackResults = {
  values: number[];

  subgroups: SubgroupResult[];

  sampleSize: number;

  subgroupSize: number;

  subgroupCount: number;

  mean: number;

  median: number;

  minimum: number;

  maximum: number;

  overallStandardDeviation: number;

  withinStandardDeviation: number;

  averageRange: number;

  xBarUcl: number;

  xBarCenterLine: number;

  xBarLcl: number;

  rangeUcl: number;

  rangeCenterLine: number;

  rangeLcl: number;

  cp: number;

  cpk: number;

  pp: number;

  ppk: number;

  cpm: number | null;

  sigmaLevel: number;

  ppmLow: number;

  ppmHigh: number;

  ppmTotal: number;
};


/* ==========================================
   COMPONENT
========================================== */

function CapabilitySixPack() {

  /* Dataset states */

  const [
    datasets,
    setDatasets,
  ] = useState<Dataset[]>([]);

  const [
    selectedDatasetId,
    setSelectedDatasetId,
  ] = useState("");

  const [
    loadingDatasets,
    setLoadingDatasets,
  ] = useState(true);


  /* Excel-file states */

  const [
    datasetRows,
    setDatasetRows,
  ] = useState<
    Record<string, unknown>[]
  >([]);

  const [
    numericColumns,
    setNumericColumns,
  ] = useState<string[]>([]);

  const [
    selectedColumn,
    setSelectedColumn,
  ] = useState("");

  const [
    loadingFile,
    setLoadingFile,
  ] = useState(false);


  /* Specification-limit states */

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


  /* Subgroup settings */

  const [
    subgroupSize,
    setSubgroupSize,
  ] = useState("5");


  /* Result states */

  const [
    sixPackResults,
    setSixPackResults,
  ] = useState<
    SixPackResults | null
  >(null);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    generatingReport,
    setGeneratingReport,
  ] = useState(false);


  /* ==========================================
     LOAD DATASETS FROM SUPABASE
  ========================================== */

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


  /* Load when page opens */

  useEffect(() => {
  void loadDatasets();
}, []);

      /* ==========================================
     HANDLE DATASET SELECTION
  ========================================== */

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

      setSixPackResults(null);

      setErrorMessage("");

      if (!datasetId) {
        return;
      }

      const selectedDataset =
        datasets.find(
          (dataset) =>
            String(
              dataset.id,
            ) === datasetId,
        );

      if (!selectedDataset) {

        setErrorMessage(
          "The selected dataset could not be found.",
        );

        return;

      }


      /* Use file_path first.
         If unavailable, use storage_path. */

      const datasetFilePath =
        selectedDataset.file_path ||
        selectedDataset.storage_path;


      if (!datasetFilePath) {

        setErrorMessage(
          "The selected dataset does not have a valid storage path.",
        );

        return;

      }


      try {

        setLoadingFile(true);


        /* =====================================
           DOWNLOAD EXCEL FILE FROM SUPABASE
        ===================================== */

        const {
          data: downloadedFile,
          error: downloadError,
        } = await supabase.storage
          .from("dataset_files")
          .download(
            datasetFilePath,
          );


        if (downloadError) {
          throw downloadError;
        }


        if (!downloadedFile) {

          throw new Error(
            "The downloaded dataset file is empty.",
          );

        }


        /* =====================================
           READ EXCEL FILE
        ===================================== */

        const arrayBuffer =
          await downloadedFile
            .arrayBuffer();


        const workbook =
          XLSX.read(
            arrayBuffer,
            {
              type: "array",
            },
          );


        /* Use saved sheet name when available */

        const worksheetName =

          selectedDataset
            .sheet_name &&

          workbook
            .SheetNames
            .includes(
              selectedDataset
                .sheet_name,
            )

            ? selectedDataset
                .sheet_name

            : workbook
                .SheetNames[0];


        if (!worksheetName) {

          throw new Error(
            "No worksheet was found in the selected Excel file.",
          );

        }


        const worksheet =
          workbook.Sheets[
            worksheetName
          ];


        if (!worksheet) {

          throw new Error(
            "The selected worksheet could not be opened.",
          );

        }


        /* =====================================
           CONVERT EXCEL TO ROW DATA
        ===================================== */

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
                defval: null,
              },
            );


        if (
          rows.length === 0
        ) {

          throw new Error(
            "The selected worksheet does not contain any data.",
          );

        }


        /* =====================================
           DETECT NUMERIC COLUMNS
        ===================================== */

        const allColumns =
          Object.keys(
            rows[0],
          );


        const detectedNumericColumns =
          allColumns.filter(
            (column) => {

              const validValues =
                rows

                  .map(
                    (row) =>
                      row[column],
                  )

                  .filter(
                    (value) =>

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
                validValues
                  .length === 0
              ) {

                return false;

              }


              const numericValues =
                validValues.filter(
                  (value) => {

                    const numberValue =
                      Number(
                        value,
                      );


                    return (
                      Number
                        .isFinite(
                          numberValue,
                        )
                    );

                  },
                );


              /* At least 80% must be numeric */

              return (

                numericValues
                  .length /

                validValues
                  .length

              ) >= 0.8;

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
            .length === 0
        ) {

          setErrorMessage(
            "No numeric columns were detected in this dataset.",
          );

        }


      } catch (error) {

        console.error(
          "Unable to open dataset:",
          error,
        );


        setErrorMessage(

          error instanceof Error

            ? error.message

            : "Unable to open the selected dataset.",

        );


      } finally {

        setLoadingFile(
          false,
        );

      }

    };

      /* ==========================================
     SAMPLE STANDARD DEVIATION
  ========================================== */

  const calculateStandardDeviation = (
    values: number[],
    mean: number,
  ) => {

    if (values.length < 2) {
      return 0;
    }

    const squaredDifferenceTotal =
      values.reduce(
        (
          total,
          value,
        ) => {

          const difference =
            value - mean;

          return (
            total +
            difference *
              difference
          );

        },
        0,
      );

    return Math.sqrt(
      squaredDifferenceTotal /
        (
          values.length -
          1
        ),
    );

  };


  /* ==========================================
     X-BAR AND R CHART CONSTANTS

     Constants for subgroup sizes
     2 to 10.
  ========================================== */

  const getControlChartConstants = (
    size: number,
  ) => {

    const constants: Record<
      number,
      {
        a2: number;
        d2: number;
        d3: number;
        d4: number;
      }
    > = {

      2: {
        a2: 1.880,
        d2: 1.128,
        d3: 0,
        d4: 3.267,
      },

      3: {
        a2: 1.023,
        d2: 1.693,
        d3: 0,
        d4: 2.574,
      },

      4: {
        a2: 0.729,
        d2: 2.059,
        d3: 0,
        d4: 2.282,
      },

      5: {
        a2: 0.577,
        d2: 2.326,
        d3: 0,
        d4: 2.114,
      },

      6: {
        a2: 0.483,
        d2: 2.534,
        d3: 0,
        d4: 2.004,
      },

      7: {
        a2: 0.419,
        d2: 2.704,
        d3: 0.076,
        d4: 1.924,
      },

      8: {
        a2: 0.373,
        d2: 2.847,
        d3: 0.136,
        d4: 1.864,
      },

      9: {
        a2: 0.337,
        d2: 2.970,
        d3: 0.184,
        d4: 1.816,
      },

      10: {
        a2: 0.308,
        d2: 3.078,
        d3: 0.223,
        d4: 1.777,
      },

    };

    return constants[size];

  };


  /* ==========================================
     NORMAL CUMULATIVE DISTRIBUTION

     Used for estimated PPM.
  ========================================== */

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


  /* ==========================================
     GENERATE X-BAR–R CAPABILITY SIX PACK
  ========================================== */

  const handleGenerateSixPack =
    async () => {

      setErrorMessage("");

      setSixPackResults(
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


      /* Validate numeric column */

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
          "USL must be greater than LSL.",
        );

        return;

      }


      /* Validate subgroup size */

      const selectedSubgroupSize =
        Number(
          subgroupSize,
        );


      if (
        !Number.isInteger(
          selectedSubgroupSize,
        ) ||
        selectedSubgroupSize < 2 ||
        selectedSubgroupSize > 10
      ) {

        setErrorMessage(
          "For the X̄–R Six Pack, enter a subgroup size from 2 to 10.",
        );

        return;

      }


      const chartConstants =
        getControlChartConstants(
          selectedSubgroupSize,
        );


      if (
        !chartConstants
      ) {

        setErrorMessage(
          "Control-chart constants are unavailable for this subgroup size.",
        );

        return;

      }


      /* Extract numeric observations */

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
        values.length <
        selectedSubgroupSize *
          2
      ) {

        setErrorMessage(
          "At least two complete subgroups are required.",
        );

        return;

      }


      setGeneratingReport(
        true,
      );


      try {

        /* =====================================
           CREATE COMPLETE SUBGROUPS
        ===================================== */

        const subgroups:
          SubgroupResult[] = [];


        for (
          let startIndex = 0;

          startIndex +
            selectedSubgroupSize <=
          values.length;

          startIndex +=
            selectedSubgroupSize
        ) {

          const subgroupValues =
            values.slice(
              startIndex,

              startIndex +
                selectedSubgroupSize,
            );


          const subgroupMean =
            subgroupValues.reduce(
              (
                total,
                value,
              ) =>
                total +
                value,
              0,
            ) /
            subgroupValues.length;


          const subgroupRange =
            Math.max(
              ...subgroupValues,
            ) -
            Math.min(
              ...subgroupValues,
            );


          subgroups.push({

            subgroupNumber:
              subgroups.length +
              1,

            values:
              subgroupValues,

            mean:
              subgroupMean,

            range:
              subgroupRange,

          });

        }


        /* Only use observations
           belonging to complete subgroups */

        const analysedValues =
          subgroups.flatMap(
            (subgroup) =>
              subgroup.values,
          );


        /* =====================================
           PROCESS STATISTICS
        ===================================== */

        const processMean =
          analysedValues.reduce(
            (
              total,
              value,
            ) =>
              total +
              value,
            0,
          ) /
          analysedValues.length;


        const sortedValues =
          [
            ...analysedValues,
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


        const median =

          sortedValues.length %
            2 ===
          0

            ? (
                sortedValues[
                  middleIndex -
                    1
                ] +

                sortedValues[
                  middleIndex
                ]
              ) /
              2

            : sortedValues[
                middleIndex
              ];


        const overallStandardDeviation =
          calculateStandardDeviation(
            analysedValues,
            processMean,
          );


        /* =====================================
           X-BAR AND R CONTROL LIMITS
        ===================================== */

        const grandMean =
          subgroups.reduce(
            (
              total,
              subgroup,
            ) =>
              total +
              subgroup.mean,
            0,
          ) /
          subgroups.length;


        const averageRange =
          subgroups.reduce(
            (
              total,
              subgroup,
            ) =>
              total +
              subgroup.range,
            0,
          ) /
          subgroups.length;


        const withinStandardDeviation =
          averageRange /
          chartConstants.d2;


        const xBarUcl =
          grandMean +
          chartConstants.a2 *
            averageRange;


        const xBarLcl =
          grandMean -
          chartConstants.a2 *
            averageRange;


        const rangeUcl =
          chartConstants.d4 *
          averageRange;


        const rangeLcl =
          chartConstants.d3 *
          averageRange;


        /* =====================================
           WITHIN CAPABILITY

           Cp and Cpk use estimated
           within-subgroup variation.
        ===================================== */

        const cp =
          (
            usl -
            lsl
          ) /
          (
            6 *
            withinStandardDeviation
          );


        const cpu =
          (
            usl -
            processMean
          ) /
          (
            3 *
            withinStandardDeviation
          );


        const cpl =
          (
            processMean -
            lsl
          ) /
          (
            3 *
            withinStandardDeviation
          );


        const cpk =
          Math.min(
            cpu,
            cpl,
          );


        /* =====================================
           OVERALL PERFORMANCE

           Pp and Ppk use overall
           standard deviation.
        ===================================== */

        const pp =
          (
            usl -
            lsl
          ) /
          (
            6 *
            overallStandardDeviation
          );


        const ppu =
          (
            usl -
            processMean
          ) /
          (
            3 *
            overallStandardDeviation
          );


        const ppl =
          (
            processMean -
            lsl
          ) /
          (
            3 *
            overallStandardDeviation
          );


        const ppk =
          Math.min(
            ppu,
            ppl,
          );


        /* =====================================
           CPM

           Only calculated when a
           valid target is entered.
        ===================================== */

        const enteredTarget =
          targetValue === ""
            ? null
            : Number(
                targetValue,
              );


        const cpm =

          enteredTarget !==
            null &&

          Number.isFinite(
            enteredTarget,
          )

            ? (
                usl -
                lsl
              ) /
              (
                6 *
                Math.sqrt(

                  Math.pow(
                    overallStandardDeviation,
                    2,
                  ) +

                  Math.pow(
                    processMean -
                      enteredTarget,
                    2,
                  ),

                )
              )

            : null;


        /* =====================================
           SIGMA LEVEL
        ===================================== */

        const sigmaLevel =
          Math.max(
            0,
            cpk *
              3,
          );


        /* =====================================
           ESTIMATED PPM

           Uses overall variation.
        ===================================== */

        const lowerZ =
          (
            lsl -
            processMean
          ) /
          overallStandardDeviation;


        const upperZ =
          (
            usl -
            processMean
          ) /
          overallStandardDeviation;


        const ppmLow =
          normalCdf(
            lowerZ,
          ) *
          1_000_000;


        const ppmHigh =
          (
            1 -
            normalCdf(
              upperZ,
            )
          ) *
          1_000_000;


        const ppmTotal =
          Math.min(
            1_000_000,

            Math.max(
              0,
              ppmLow +
                ppmHigh,
            ),
          );


        /* =====================================
           SAVE RESULTS
        ===================================== */

       /* =====================================
   SAVE RESULTS
===================================== */

setSixPackResults({

  values:
    analysedValues,

  subgroups,

  sampleSize:
    analysedValues.length,

  subgroupSize:
    selectedSubgroupSize,

  subgroupCount:
    subgroups.length,

  mean:
    processMean,

  median,

  minimum:
    Math.min(
      ...analysedValues,
    ),

  maximum:
    Math.max(
      ...analysedValues,
    ),

  overallStandardDeviation,

  withinStandardDeviation,

  averageRange,

  xBarUcl,

  xBarCenterLine:
    grandMean,

  xBarLcl,

  rangeUcl,

  rangeCenterLine:
    averageRange,

  rangeLcl,

  cp,

  cpk,

  pp,

  ppk,

  cpm,

  sigmaLevel,

  ppmLow,

  ppmHigh,

  ppmTotal,

});


/* =====================================
   SAVE SIX-PACK ANALYSIS HISTORY
===================================== */

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


const capabilityClassification =

  cpk >= 1.33

    ? "capable"

    : cpk >= 1

      ? "marginal"

      : "not_capable";


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
        "capability_six_pack",

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
      Cpk is saved as the
      primary Six-Pack result.
      */

      result_value:
        cpk,

      classification:
        capabilityClassification,

    });


if (
  analysisHistoryError
) {

  console.error(
    "Unable to save Capability Six Pack history:",
    analysisHistoryError,
  );

}

      } catch (
        error
      ) {

        console.error(
          "Unable to generate Capability Six Pack:",
          error,
        );


        setErrorMessage(

          error instanceof
            Error

            ? error.message

            : "Unable to generate the Capability Six Pack.",

        );

      } finally {

        setGeneratingReport(
          false,
        );

      }

    };


  

    

    const histogramData = (() => {
  if (
    !sixPackResults ||
    sixPackResults.values.length === 0
  ) {
    return [];
  }

  

  const values =
    sixPackResults.values;

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
    sixPackResults
      .overallStandardDeviation;

  return Array.from(
    {
      length:
        numberOfBins,
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
        standardDeviation >
        0
      ) {
        const exponent =
          -0.5 *
          Math.pow(
            (
              binCenter -
              sixPackResults
                .mean
            ) /
              standardDeviation,
            2,
          );

        const density =
          Math.exp(
            exponent,
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
        bin:
          binCenter.toFixed(
            3,
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

const probabilityPlotData = (() => {
  if (
    !sixPackResults ||
    sixPackResults.values.length < 2
  ) {
    return [];
  }

  const sortedValues = [
    ...sixPackResults.values,
  ].sort(
    (firstValue, secondValue) =>
      firstValue - secondValue,
  );

  const sampleSize =
    sortedValues.length;

  /*
    Approximation of the inverse
    standard-normal distribution.
  */

  const inverseNormal = (
    probability: number,
  ) => {
    const firstCoefficient = [
      -39.6968302866538,
      220.946098424521,
      -275.928510446969,
      138.357751867269,
      -30.6647980661472,
      2.50662827745924,
    ];

    const secondCoefficient = [
      -54.4760987982241,
      161.585836858041,
      -155.698979859887,
      66.8013118877197,
      -13.2806815528857,
    ];

    const thirdCoefficient = [
      -0.00778489400243029,
      -0.322396458041136,
      -2.40075827716184,
      -2.54973253934373,
      4.37466414146497,
      2.93816398269878,
    ];

    const fourthCoefficient = [
      0.00778469570904146,
      0.32246712907004,
      2.445134137143,
      3.75440866190742,
    ];

    const lowerProbability =
      0.02425;

    const upperProbability =
      1 - lowerProbability;

    if (
      probability <
      lowerProbability
    ) {
      const q =
        Math.sqrt(
          -2 *
            Math.log(
              probability,
            ),
        );

      return (
        (
          (
            (
              (
                thirdCoefficient[0] *
                  q +
                thirdCoefficient[1]
              ) *
                q +
              thirdCoefficient[2]
            ) *
              q +
            thirdCoefficient[3]
          ) *
            q +
          thirdCoefficient[4]
        ) *
          q +
        thirdCoefficient[5]
      ) /
        (
          (
            (
              (
                fourthCoefficient[0] *
                  q +
                fourthCoefficient[1]
              ) *
                q +
              fourthCoefficient[2]
            ) *
              q +
            fourthCoefficient[3]
          ) *
            q +
          1
        );
    }

    if (
      probability >
      upperProbability
    ) {
      const q =
        Math.sqrt(
          -2 *
            Math.log(
              1 -
                probability,
            ),
        );

      return -(
        (
          (
            (
              (
                thirdCoefficient[0] *
                  q +
                thirdCoefficient[1]
              ) *
                q +
              thirdCoefficient[2]
            ) *
              q +
            thirdCoefficient[3]
          ) *
            q +
          thirdCoefficient[4]
        ) *
          q +
        thirdCoefficient[5]
      ) /
        (
          (
            (
              (
                fourthCoefficient[0] *
                  q +
                fourthCoefficient[1]
              ) *
                q +
              fourthCoefficient[2]
            ) *
              q +
            fourthCoefficient[3]
          ) *
            q +
          1
        );
    }

    const q =
      probability -
      0.5;

    const r =
      q * q;

    return (
      (
        (
          (
            (
              (
                firstCoefficient[0] *
                  r +
                firstCoefficient[1]
              ) *
                r +
              firstCoefficient[2]
            ) *
              r +
            firstCoefficient[3]
          ) *
            r +
          firstCoefficient[4]
        ) *
          r +
        firstCoefficient[5]
      ) *
      q
    ) /
      (
        (
          (
            (
              (
                secondCoefficient[0] *
                  r +
                secondCoefficient[1]
              ) *
                r +
              secondCoefficient[2]
            ) *
              r +
            secondCoefficient[3]
          ) *
            r +
          secondCoefficient[4]
        ) *
          r +
        1
      );
  };

  return sortedValues.map(
    (
      actualValue,
      index,
    ) => {
      const plottingPosition =
        (
          index +
          1 -
          0.375
        ) /
        (
          sampleSize +
          0.25
        );

      const theoreticalQuantile =
        inverseNormal(
          plottingPosition,
        );

      const referenceValue =
        sixPackResults.mean +
        theoreticalQuantile *
          sixPackResults
            .overallStandardDeviation;

      return {
        theoreticalQuantile:
          Number(
            theoreticalQuantile.toFixed(
              5,
            ),
          ),

        actualValue:
          Number(
            actualValue.toFixed(
              5,
            ),
          ),

        referenceValue:
          Number(
            referenceValue.toFixed(
              5,
            ),
          ),
      };
    },
  );
})();



/* ==========================================
   LAST OBSERVATIONS DATA
========================================== */

const lastObservationsData = (() => {
  if (
    !sixPackResults ||
    sixPackResults.values.length === 0
  ) {
    return [];
  }

  /*
    Minitab-style recent process view.

    Show a maximum of the last
    25 individual observations.
  */

  const numberOfObservations =
    Math.min(
      25,
      sixPackResults.values.length,
    );

  const startingIndex =
    sixPackResults.values.length -
    numberOfObservations;

  return sixPackResults.values

    .slice(
      startingIndex,
    )

    .map(
      (
        value,
        index,
      ) => ({
        observation:
          startingIndex +
          index +
          1,

        value:
          Number(
            value.toFixed(
              6,
            ),
          ),

        mean:
          Number(
            sixPackResults.mean.toFixed(
              6,
            ),
          ),
      }),
    );
})();



/* ==========================================
   CAPABILITY PLOT DATA
========================================== */

const capabilityPlotData = (() => {
  if (!sixPackResults) {
    return [];
  }

  const lsl =
    Number(
      lowerSpecLimit,
    );

  const usl =
    Number(
      upperSpecLimit,
    );

  const mean =
    sixPackResults.mean;

  const withinSigma =
    sixPackResults
      .withinStandardDeviation;

  const overallSigma =
    sixPackResults
      .overallStandardDeviation;

  return [
    {
      category:
        "Specification",

      lower:
        lsl,

      center:
        targetValue !== "" &&
        Number.isFinite(
          Number(
            targetValue,
          ),
        )
          ? Number(
              targetValue,
            )
          : (
              lsl +
              usl
            ) /
            2,

      upper:
        usl,
    },

    {
      category:
        "Within",

      lower:
        mean -
        3 *
          withinSigma,

      center:
        mean,

      upper:
        mean +
        3 *
          withinSigma,
    },

    {
      category:
        "Overall",

      lower:
        mean -
        3 *
          overallSigma,

      center:
        mean,

      upper:
        mean +
        3 *
          overallSigma,
    },
  ];
})();







      return (
    <div className="capability-six-pack-page">

      <Sidebar />

      <Header />

      <main className="capability-six-pack-content">

        <section className="six-pack-page-heading">

          <h1>
            Capability Six Pack
          </h1>

          <p>
            Comprehensive process capability analysis
            with X̄ and R control charts
          </p>

        </section>

        

                {/* =====================================
            ANALYSIS CONFIGURATION
        ===================================== */}

        <section className="six-pack-configuration-card">

          <h2>
            Analysis Configuration
          </h2>


          {/* Dataset and column selection */}

          <div className="six-pack-selection-grid">

            <div className="six-pack-input-group">

              <label htmlFor="six-pack-dataset">
                Select Dataset
              </label>

              <select
                id="six-pack-dataset"
                value={selectedDatasetId}
                disabled={loadingDatasets}
                onChange={(event) =>
                  void handleDatasetChange(
                    event.target.value,
                  )
                }
              >

                <option value="">

                  {loadingDatasets
                    ? "Loading datasets..."
                    : "Choose a dataset"}

                </option>

                {datasets.map(
                  (dataset) => (

                    <option
                      key={dataset.id}
                      value={String(
                        dataset.id,
                      )}
                    >

                      {dataset.dataset_name ||
                        dataset.file_name ||
                        "Untitled Dataset"}

                    </option>

                  ),
                )}

              </select>

            </div>


            <div className="six-pack-input-group">

              <label htmlFor="six-pack-column">
                Select Numeric Column
              </label>

              <select
                id="six-pack-column"
                value={selectedColumn}
                disabled={
                  !selectedDatasetId ||
                  loadingFile ||
                  numericColumns.length === 0
                }
                onChange={(event) => {

                  setSelectedColumn(
                    event.target.value,
                  );

                  setSixPackResults(
                    null,
                  );

                }}
              >

                <option value="">

                  {loadingFile
                    ? "Reading dataset..."
                    : "Choose a numeric column"}

                </option>

                {numericColumns.map(
                  (column) => (

                    <option
                      key={column}
                      value={column}
                    >
                      {column}
                    </option>

                  ),
                )}

              </select>

            </div>

          </div>


          {/* Specification limits */}

          <div className="six-pack-section-divider">

            <h3>
              Specification Limits
            </h3>

          </div>


          <div className="six-pack-specification-grid">

            <div className="six-pack-input-group">

              <label htmlFor="six-pack-lsl">
                Lower Spec Limit (LSL)
              </label>

              <input
                id="six-pack-lsl"
                type="number"
                step="any"
                value={lowerSpecLimit}
                placeholder="Enter LSL"
                onChange={(event) => {

                  setLowerSpecLimit(
                    event.target.value,
                  );

                  setSixPackResults(
                    null,
                  );

                }}
              />

            </div>


            <div className="six-pack-input-group">

              <label htmlFor="six-pack-usl">
                Upper Spec Limit (USL)
              </label>

              <input
                id="six-pack-usl"
                type="number"
                step="any"
                value={upperSpecLimit}
                placeholder="Enter USL"
                onChange={(event) => {

                  setUpperSpecLimit(
                    event.target.value,
                  );

                  setSixPackResults(
                    null,
                  );

                }}
              />

            </div>


            <div className="six-pack-input-group">

              <label htmlFor="six-pack-target">
                Target Value (Optional)
              </label>

              <input
                id="six-pack-target"
                type="number"
                step="any"
                value={targetValue}
                placeholder="Enter target"
                onChange={(event) => {

                  setTargetValue(
                    event.target.value,
                  );

                  setSixPackResults(
                    null,
                  );

                }}
              />

            </div>

          </div>


          {/* Subgroup settings */}

          <div className="six-pack-section-divider">

            <h3>
              Subgroup Settings
            </h3>

          </div>


          <div className="six-pack-subgroup-row">

            <div className="six-pack-input-group">

              <label htmlFor="six-pack-subgroup-size">
                Subgroup Size
              </label>

              <input
                id="six-pack-subgroup-size"
                type="number"
                min="2"
                max="10"
                step="1"
                value={subgroupSize}
                onChange={(event) => {

                  setSubgroupSize(
                    event.target.value,
                  );

                  setSixPackResults(
                    null,
                  );

                }}
              />

              <span className="six-pack-input-help">
                Use a subgroup size from 2 to 10
                for an X̄–R Capability Six Pack.
              </span>

            </div>

          </div>


          {/* Generate button */}

          <button
            type="button"
            className="generate-six-pack-button"
            disabled={
              generatingReport ||
              loadingFile ||
              !selectedDatasetId ||
              !selectedColumn ||
              !lowerSpecLimit ||
              !upperSpecLimit ||
              datasetRows.length === 0
            }
            onClick={
              handleGenerateSixPack
            }
          >

            <Layers3 size={20} />

            {generatingReport
              ? "Generating Six Pack..."
              : "Generate Six Pack Report"}

          </button>


          {/* Error message */}

          {errorMessage && (

            <div className="six-pack-error-message">

              {errorMessage}

            </div>

          )}

        </section>

                {/* =====================================
            EMPTY STATE
        ===================================== */}

        {!sixPackResults && (

          <section className="six-pack-empty-card">

            <div className="six-pack-empty-icon">

              <BarChart3 size={52} />

            </div>

            <h2>
              No Analysis Results
            </h2>

            <p>
              Select a dataset, numeric column,
              specification limits, and subgroup
              size, then click
              “Generate Six Pack Report”.
            </p>

          </section>

        )}


        {/* =====================================
            SIX-PACK RESULTS
        ===================================== */}

        {sixPackResults && (

          <section className="six-pack-results">


            {/* =================================
                CAPABILITY SUMMARY
            ================================= */}

            <section className="six-pack-summary-card">

              <div className="six-pack-summary-heading">

                <div className="six-pack-summary-icon">

                  <Activity size={27} />

                </div>

                <div>

                  <h2>
                    Process Capability Summary
                  </h2>

                  <p>
                    X̄–R capability analysis for{" "}

                    <strong>
                      {selectedColumn}
                    </strong>
                  </p>

                </div>

              </div>


              <div className="six-pack-index-grid">


                <div className="six-pack-index-item">

                  <span>
                    Cp
                  </span>

                  <strong>
                    {sixPackResults.cp
                      .toFixed(3)}
                  </strong>

                  <small>
                    Potential capability
                  </small>

                </div>


                <div className="six-pack-index-item">

                  <span>
                    Cpk
                  </span>

                  <strong>
                    {sixPackResults.cpk
                      .toFixed(3)}
                  </strong>

                  <small>
                    Actual capability
                  </small>

                </div>


                <div className="six-pack-index-item">

                  <span>
                    Pp
                  </span>

                  <strong>
                    {sixPackResults.pp
                      .toFixed(3)}
                  </strong>

                  <small>
                    Overall performance
                  </small>

                </div>


                <div className="six-pack-index-item">

                  <span>
                    Ppk
                  </span>

                  <strong>
                    {sixPackResults.ppk
                      .toFixed(3)}
                  </strong>

                  <small>
                    Overall performance index
                  </small>

                </div>


                <div className="six-pack-index-item">

                  <span>
                    Cpm
                  </span>

                  <strong>

                    {sixPackResults.cpm !== null

                      ? sixPackResults.cpm
                          .toFixed(3)

                      : "—"}

                  </strong>

                  <small>
                    Target capability
                  </small>

                </div>


                <div className="six-pack-index-item sigma">

                  <span>
                    Sigma
                  </span>

                  <strong>

                    {sixPackResults
                      .sigmaLevel
                      .toFixed(2)}

                    σ

                  </strong>

                  <small>
                    Process sigma level
                  </small>

                </div>

              </div>

            </section>


            {/* =================================
                MAIN RESULTS GRID
            ================================= */}

            <div className="six-pack-main-grid">


              {/* LEFT SIDE:
                  SIX MINITAB-STYLE GRAPHS */}

              <section className="six-pack-chart-area">

                <div className="six-pack-chart-heading">

                  <div>

                    <h2>
                      Capability Six Pack
                    </h2>

                    <p>
                      Six statistical views for
                      process stability, normality,
                      and capability.
                    </p>

                  </div>

                  <div className="six-pack-ready-badge">

                    <CheckCircle2 size={17} />

                    Analysis Ready

                  </div>

                </div>


                <div className="six-pack-chart-grid">


                  {/* 1. X-BAR CHART */}

                  <article className="six-pack-chart-card">

                    <div className="six-pack-card-title">

                      <LineChart size={21} />

                      <div>

                        <h3>
                          X̄ Chart
                        </h3>

                        <p>
                          Subgroup means
                        </p>

                      </div>

                    </div>

                   <div className="six-pack-actual-chart">

  <ResponsiveContainer
    width="100%"
    height="100%"
  >

    <RechartsLineChart
      data={sixPackResults.subgroups.map(
        (subgroup) => ({
          subgroup:
            subgroup.subgroupNumber,

          mean:
            Number(
              subgroup.mean.toFixed(
                6,
              ),
            ),
        }),
      )}
      margin={{
        top: 20,
        right: 25,
        left: 10,
        bottom: 20,
      }}
    >

      <CartesianGrid
        strokeDasharray="3 3"
        vertical={false}
      />

      <XAxis
        dataKey="subgroup"
        label={{
          value: "Subgroup",
          position:
            "insideBottom",
          offset: -12,
        }}
      />

      <YAxis
        domain={[
          (
            dataMinimum:
              number,
          ) =>
            Math.min(
              dataMinimum,
              sixPackResults
                .xBarLcl,
            ) -
            Math.abs(
              sixPackResults
                .xBarUcl -
              sixPackResults
                .xBarLcl,
            ) *
              0.12,

          (
            dataMaximum:
              number,
          ) =>
            Math.max(
              dataMaximum,
              sixPackResults
                .xBarUcl,
            ) +
            Math.abs(
              sixPackResults
                .xBarUcl -
              sixPackResults
                .xBarLcl,
            ) *
              0.12,
        ]}
        tickFormatter={(
          value,
        ) =>
          Number(
            value,
          ).toFixed(3)
        }
        width={68}
      />

      <Tooltip
        formatter={(
          value,
        ) => [
          Number(
            value,
          ).toFixed(5),

          "Subgroup Mean",
        ]}
      />

      <Legend
  verticalAlign="top"
  align="center"
  height={40}
/>

      <ReferenceLine
        y={
          sixPackResults
            .xBarUcl
        }
        stroke="#dc2626"
        strokeDasharray="6 5"
        label={{
          value: `UCL ${sixPackResults.xBarUcl.toFixed(
            4,
          )}`,
          position: "insideTopRight",
        }}
      />

      <ReferenceLine
        y={
          sixPackResults
            .xBarCenterLine
        }
        stroke="#16a34a"
        label={{
          value: `X̄̄ ${sixPackResults.xBarCenterLine.toFixed(
            4,
          )}`,
          position: "insideTopRight",
        }}
      />

      <ReferenceLine
        y={
          sixPackResults
            .xBarLcl
        }
        stroke="#dc2626"
        strokeDasharray="6 5"
        label={{
          value: `LCL ${sixPackResults.xBarLcl.toFixed(
            4,
          )}`,
          position:
            "insideBottomRight",
        }}
      />

      <Line
        type="linear"
        dataKey="mean"
        name="Subgroup Mean"
        stroke="#244496"
        strokeWidth={2}
        dot={{
          r: 4,
        }}
        activeDot={{
          r: 6,
        }}
        isAnimationActive
      />

    </RechartsLineChart>

  </ResponsiveContainer>

</div>

                  </article>


                  {/* 2. R CHART */}

                  <article className="six-pack-chart-card">

                    <div className="six-pack-card-title">

                      <Activity size={21} />

                      <div>

                        <h3>
                          R Chart
                        </h3>

                        <p>
                          Within-subgroup ranges
                        </p>

                      </div>

                    </div>

                    <div className="six-pack-actual-chart">

  <ResponsiveContainer
    width="100%"
    height="100%"
  >

    <RechartsLineChart
      data={sixPackResults.subgroups.map(
        (subgroup) => ({
          subgroup:
            subgroup.subgroupNumber,

          range:
            Number(
              subgroup.range.toFixed(
                6,
              ),
            ),
        }),
      )}
      margin={{
        top: 35,
        right: 35,
        left: 10,
        bottom: 25,
      }}
    >

      <CartesianGrid
        strokeDasharray="3 3"
        vertical={false}
      />

      <XAxis
        dataKey="subgroup"
        label={{
          value: "Subgroup",
          position:
            "insideBottom",
          offset: -12,
        }}
      />

      <YAxis
        domain={[
          0,

          (
            dataMaximum:
              number,
          ) =>
            Math.max(
              dataMaximum,
              sixPackResults
                .rangeUcl,
            ) *
            1.15,
        ]}
        tickFormatter={(
          value,
        ) =>
          Number(
            value,
          ).toFixed(3)
        }
        width={68}
      />

      <Tooltip
        formatter={(
          value,
        ) => [
          Number(
            value,
          ).toFixed(5),

          "Subgroup Range",
        ]}
      />

        <Legend
  verticalAlign="top"
  align="center"
  height={40}
/>

      <ReferenceLine
        y={
          sixPackResults
            .rangeUcl
        }
        stroke="#dc2626"
        strokeDasharray="6 5"
        label={{
          value: `UCL ${sixPackResults.rangeUcl.toFixed(
            4,
          )}`,
          position:
            "insideTopRight",
        }}
      />

      <ReferenceLine
        y={
          sixPackResults
            .rangeCenterLine
        }
        stroke="#16a34a"
        label={{
          value: `R̄ ${sixPackResults.rangeCenterLine.toFixed(
            4,
          )}`,
          position:
            "insideTopRight",
        }}
      />

      <ReferenceLine
        y={
          sixPackResults
            .rangeLcl
        }
        stroke="#dc2626"
        strokeDasharray="6 5"
        label={{
          value: `LCL ${sixPackResults.rangeLcl.toFixed(
            4,
          )}`,
          position:
            "insideBottomRight",
        }}
      />

      <Line
        type="linear"
        dataKey="range"
        name="Subgroup Range"
        stroke="#244496"
        strokeWidth={2}
        dot={{
          r: 4,
        }}
        activeDot={{
          r: 6,
        }}
        isAnimationActive
      />

    </RechartsLineChart>

  </ResponsiveContainer>

</div>

                  </article>


                  {/* 3. HISTOGRAM */}

                  <article className="six-pack-chart-card">

                    <div className="six-pack-card-title">

                      <BarChart3 size={21} />

                      <div>

                        <h3>
                          Capability Histogram
                        </h3>

                        <p>
                          Distribution with
                          specification limits
                        </p>

                      </div>

                    </div>

                    <div className="six-pack-actual-chart">

  <ResponsiveContainer
    width="100%"
    height="100%"
  >

    <ComposedChart
      data={histogramData}
      margin={{
        top: 35,
        right: 35,
        left: 5,
        bottom: 30,
      }}
    >

      <CartesianGrid
        strokeDasharray="3 3"
        vertical={false}
      />

      <XAxis
        dataKey="bin"
        interval={0}
        angle={-35}
        textAnchor="end"
        height={65}
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

          if (
            name ===
            "Frequency"
          ) {
            return [
              Number(
                value,
              ).toFixed(0),

              "Frequency",
            ];
          }

          return [
            Number(
              value,
            ).toFixed(3),

            "Normal Curve",
          ];
        }}
      />

      <Legend
        verticalAlign="top"
        align="center"
        height={38}
      />

      <ReferenceLine
        x={
          sixPackResults
            .mean
            .toFixed(3)
        }
        stroke="#111827"
        strokeWidth={2}
        strokeDasharray="7 5"
        label={{
          value:
            `Mean ${sixPackResults.mean.toFixed(
              3,
            )}`,

          position:
            "insideTopRight",
        }}
      />

      <Bar
        dataKey="frequency"
        name="Frequency"
        fill="#2f80b7"
        stroke="#1e5f8a"
        barSize={34}
      />

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


                  {/* 4. NORMAL PROBABILITY */}

                  <article className="six-pack-chart-card">

                    <div className="six-pack-card-title">

                      <TrendingUp size={21} />

                      <div>

                        <h3>
                          Normal Probability Plot
                        </h3>

                        <p>
                          Distribution normality
                          assessment
                        </p>

                      </div>

                    </div>

                    <div className="six-pack-actual-chart">

  <ResponsiveContainer
    width="100%"
    height="100%"
  >

    <ScatterChart
      margin={{
        top: 35,
        right: 35,
        left: 15,
        bottom: 35,
      }}
    >

      <CartesianGrid
        strokeDasharray="3 3"
      />

      <XAxis
        type="number"
        dataKey="theoreticalQuantile"
        name="Theoretical Quantile"
        domain={[
          "dataMin - 0.2",
          "dataMax + 0.2",
        ]}
        tickFormatter={(
          value,
        ) =>
          Number(
            value,
          ).toFixed(1)
        }
        label={{
          value:
            "Theoretical Quantiles",

          position:
            "insideBottom",

          offset: -20,
        }}
      />

      <YAxis
        type="number"
        dataKey="actualValue"
        name="Actual Value"
        domain={[
          "dataMin - 0.01",
          "dataMax + 0.01",
        ]}
        tickFormatter={(
          value,
        ) =>
          Number(
            value,
          ).toFixed(3)
        }
        width={70}
        label={{
          value:
            "Actual Values",

          angle: -90,

          position:
            "insideLeft",
        }}
      />

      <Tooltip
        cursor={{
          strokeDasharray:
            "3 3",
        }}
        formatter={(
          value,
          name,
        ) => [
          Number(
            value,
          ).toFixed(5),

          name,
        ]}
      />

      <Legend
        verticalAlign="top"
        align="center"
        height={38}
      />

      <Scatter
        name="Data Points"
        data={
          probabilityPlotData
        }
        fill="#2563a6"
      />

      <Line
        name="Reference Line"
        data={
          probabilityPlotData
        }
        type="linear"
        dataKey="referenceValue"
        stroke="#f97316"
        strokeWidth={2.5}
        strokeDasharray="7 5"
        dot={false}
        activeDot={false}
        legendType="line"
      />

    </ScatterChart>

  </ResponsiveContainer>

</div>

                  </article>


                  {/* 5. LAST OBSERVATIONS */}

                  <article className="six-pack-chart-card">

                    <div className="six-pack-card-title">

                      <LineChart size={21} />

                      <div>

                        <h3>
                          Last Observations
                        </h3>

                        <p>
                          Recent process behaviour
                        </p>

                      </div>

                    </div>

                    <div className="six-pack-actual-chart">

  <ResponsiveContainer
    width="100%"
    height="100%"
  >

    <RechartsLineChart
      data={
        lastObservationsData
      }
      margin={{
        top: 35,
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
        dataKey="observation"
        type="number"
        domain={[
          "dataMin",
          "dataMax",
        ]}
        allowDecimals={false}
        label={{
          value:
            "Observation",

          position:
            "insideBottom",

          offset: -20,
        }}
      />

      <YAxis
        domain={[
          (
            dataMinimum:
              number,
          ) => {

            const lowerLimit =
              Number(
                lowerSpecLimit,
              );

            const minimumValue =
              Number.isFinite(
                lowerLimit,
              )
                ? Math.min(
                    dataMinimum,
                    lowerLimit,
                  )
                : dataMinimum;

            const chartRange =
              Math.max(
                Math.abs(
                  sixPackResults.maximum -
                    sixPackResults.minimum,
                ),
                0.001,
              );

            return (
              minimumValue -
              chartRange *
                0.1
            );
          },

          (
            dataMaximum:
              number,
          ) => {

            const upperLimit =
              Number(
                upperSpecLimit,
              );

            const maximumValue =
              Number.isFinite(
                upperLimit,
              )
                ? Math.max(
                    dataMaximum,
                    upperLimit,
                  )
                : dataMaximum;

            const chartRange =
              Math.max(
                Math.abs(
                  sixPackResults.maximum -
                    sixPackResults.minimum,
                ),
                0.001,
              );

            return (
              maximumValue +
              chartRange *
                0.1
            );
          },
        ]}
        tickFormatter={(
          value,
        ) =>
          Number(
            value,
          ).toFixed(3)
        }
        width={72}
        label={{
          value:
            selectedColumn,

          angle: -90,

          position:
            "insideLeft",
        }}
      />

      <Tooltip
        formatter={(
          value,
          name,
        ) => [
          Number(
            value,
          ).toFixed(5),

          name ===
          "value"
            ? selectedColumn
            : "Process Mean",
        ]}
        labelFormatter={(
          observation,
        ) =>
          `Observation ${observation}`
        }
      />

      <Legend
        verticalAlign="top"
        align="center"
        height={38}
      />


      {/* Lower specification limit */}

      <ReferenceLine
        y={
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
            "insideBottomRight",
        }}
      />


      {/* Process mean */}

      <ReferenceLine
        y={
          sixPackResults.mean
        }
        stroke="#16a34a"
        strokeWidth={2}
        strokeDasharray="5 4"
        label={{
          value:
            `Mean ${sixPackResults.mean.toFixed(
              3,
            )}`,

          position:
            "insideTopRight",
        }}
      />


      {/* Upper specification limit */}

      <ReferenceLine
        y={
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


      {/* Observation line */}

      <Line
        type="linear"
        dataKey="value"
        name={
          selectedColumn
        }
        stroke="#244496"
        strokeWidth={2.5}
        dot={{
          r: 4,
          fill: "#244496",
        }}
        activeDot={{
          r: 6,
        }}
        isAnimationActive
      />

    </RechartsLineChart>

  </ResponsiveContainer>

</div>

                  </article>


                  {/* 6. CAPABILITY PLOT */}

                  <article className="six-pack-chart-card">

                    <div className="six-pack-card-title">

                      <Target size={21} />

                      <div>

                        <h3>
                          Capability Plot
                        </h3>

                        <p>
                          Process spread versus
                          specification limits
                        </p>

                      </div>

                    </div>

                    <div className="six-pack-capability-chart">

  <div className="capability-plot-scale">

    <span>
      {Number(
        lowerSpecLimit,
      ).toFixed(3)}
    </span>

    <span>
      {sixPackResults
        .mean
        .toFixed(3)}
    </span>

    <span>
      {Number(
        upperSpecLimit,
      ).toFixed(3)}
    </span>

  </div>


  {/* SPECIFICATION RANGE */}

  <div className="capability-plot-row">

    <div className="capability-plot-label">

      <strong>
        Specification
      </strong>

      <span>
        LSL to USL
      </span>

    </div>

    <div className="capability-range-area">

      <div className="specification-range-line">

        <span className="range-end left-end" />

        <span className="range-center target-center" />

        <span className="range-end right-end" />

      </div>

      <span className="capability-left-value">

        {capabilityPlotData[0]
          .lower
          .toFixed(3)}

      </span>

      <span className="capability-center-value">

        {capabilityPlotData[0]
          .center
          .toFixed(3)}

      </span>

      <span className="capability-right-value">

        {capabilityPlotData[0]
          .upper
          .toFixed(3)}

      </span>

    </div>

  </div>


  {/* WITHIN PROCESS RANGE */}

  <div className="capability-plot-row">

    <div className="capability-plot-label">

      <strong>
        Within
      </strong>

      <span>
        ±3σ within
      </span>

    </div>

    <div className="capability-range-area">

      <div className="within-range-line">

        <span className="range-end left-end" />

        <span className="range-center mean-center" />

        <span className="range-end right-end" />

      </div>

      <span className="capability-left-value">

        {capabilityPlotData[1]
          .lower
          .toFixed(3)}

      </span>

      <span className="capability-center-value">

        {capabilityPlotData[1]
          .center
          .toFixed(3)}

      </span>

      <span className="capability-right-value">

        {capabilityPlotData[1]
          .upper
          .toFixed(3)}

      </span>

    </div>

  </div>


  {/* OVERALL PROCESS RANGE */}

  <div className="capability-plot-row">

    <div className="capability-plot-label">

      <strong>
        Overall
      </strong>

      <span>
        ±3σ overall
      </span>

    </div>

    <div className="capability-range-area">

      <div className="overall-range-line">

        <span className="range-end left-end" />

        <span className="range-center mean-center" />

        <span className="range-end right-end" />

      </div>

      <span className="capability-left-value">

        {capabilityPlotData[2]
          .lower
          .toFixed(3)}

      </span>

      <span className="capability-center-value">

        {capabilityPlotData[2]
          .center
          .toFixed(3)}

      </span>

      <span className="capability-right-value">

        {capabilityPlotData[2]
          .upper
          .toFixed(3)}

      </span>

    </div>

  </div>


  {/* CAPABILITY INDEX SUMMARY */}

  <div className="capability-plot-indices">

    <div>

      <span>
        Cp
      </span>

      <strong>
        {sixPackResults.cp
          .toFixed(3)}
      </strong>

    </div>

    <div>

      <span>
        Cpk
      </span>

      <strong>
        {sixPackResults.cpk
          .toFixed(3)}
      </strong>

    </div>

    <div>

      <span>
        Pp
      </span>

      <strong>
        {sixPackResults.pp
          .toFixed(3)}
      </strong>

    </div>

    <div>

      <span>
        Ppk
      </span>

      <strong>
        {sixPackResults.ppk
          .toFixed(3)}
      </strong>

    </div>

  </div>

</div>

                  </article>

                </div>

              </section>

            </div>

          </section>

        )}


      </main>

    </div>
  );

}

export default CapabilitySixPack;
