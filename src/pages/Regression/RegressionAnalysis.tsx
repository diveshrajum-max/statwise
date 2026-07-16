import {
  Activity,
  Database,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import * as XLSX from "xlsx";

import Sidebar from "../../components/layout/Sidebar";
import Header from "../../components/layout/Header";

import {
  supabase,
} from "../../lib/supabase";

import "./RegressionAnalysis.css";


/* ========================================
   TYPES
======================================== */

type Dataset = {
  id:
    number |
    string;

  dataset_name:
    string |
    null;

  file_name:
    string |
    null;

  file_path:
    string |
    null;

  sheet_name:
    string |
    null;
};


type RegressionType =
  | "simple"
  | "multiple";

type RegressionResult = {
  intercept: number;

  slope: number;

  secondSlope:
  number | null;

  interceptStandardError:
  number;

  slopeStandardError:
  number;

  secondSlopeStandardError:
  number | null;

  interceptTValue:
  number;

slopeTValue:
  number;

  secondSlopeTValue:
  number | null;

interceptPValue:
  number;

slopePValue:
  number;

  secondSlopePValue:
  number | null;

  rSquared: number;

  residualStandardError:
    number;

  responseVariable:
    string;

  predictorVariable:
    string;

  secondPredictorVariable:
  string | null;

  actualValues:
    number[];

  predictorValues:
    number[];


  fittedValues:
    number[];

  residuals:
    number[];

  sampleSize:
    number;
};


/* ========================================
   NORMAL DISTRIBUTION HELPERS
======================================== */

const calculateErrorFunction =
  (
    value: number,
  ) => {

    const sign =
      value >= 0
        ? 1
        : -1;

    const absoluteValue =
      Math.abs(
        value,
      );

    const firstCoefficient =
      0.254829592;

    const secondCoefficient =
      -0.284496736;

    const thirdCoefficient =
      1.421413741;

    const fourthCoefficient =
      -1.453152027;

    const fifthCoefficient =
      1.061405429;

    const constant =
      0.3275911;

    const transformedValue =

      1 /

      (
        1 +

        constant *
        absoluteValue
      );


    const result =

      1 -

      (

        (

          (

            (

              (

                fifthCoefficient *
                transformedValue +

                fourthCoefficient

              ) *

              transformedValue +

              thirdCoefficient

            ) *

            transformedValue +

            secondCoefficient

          ) *

          transformedValue +

          firstCoefficient

        ) *

        transformedValue *

        Math.exp(
          -absoluteValue *
          absoluteValue,
        )

      );


    return (
      sign *
      result
    );

  };


const calculateTwoSidedPValue =
  (
    tValue: number,
  ) => {

    /*
    Normal approximation for
    the two-sided p-value.
    */

    const absoluteTValue =

      Math.abs(
        tValue,
      );


    const cumulativeProbability =

      0.5 *

      (
        1 +

        calculateErrorFunction(

          absoluteTValue /

          Math.sqrt(
            2,
          ),

        )
      );


    return Math.max(

      0,

      Math.min(

        1,

        2 *

        (
          1 -
          cumulativeProbability
        ),

      ),

    );

  };


const getSignificance =
  (
    pValue: number,
  ) => {

    if (
      pValue <
      0.001
    ) {

      return "***";

    }


    if (
      pValue <
      0.01
    ) {

      return "**";

    }


    if (
      pValue <
      0.05
    ) {

      return "*";

    }


    return "ns";

  };


/* ========================================
   COMPONENT
======================================== */

function RegressionAnalysis() {

  /* ========================================
     DATASETS
  ======================================== */

  const [
    datasets,
    setDatasets,
  ] =
    useState<
      Dataset[]
    >(
      [],
    );


  const [
    selectedDatasetId,
    setSelectedDatasetId,
  ] =
    useState(
      "",
    );


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

  const [
  regressionResult,
  setRegressionResult,
] =
  useState<
    RegressionResult |
    null
  >(
    null,
  );


  /* ========================================
     REGRESSION SETTINGS
  ======================================== */

  const [
    regressionType,
    setRegressionType,
  ] =
    useState<
      RegressionType
    >(
      "simple",
    );


  const [
    responseVariable,
    setResponseVariable,
  ] =
    useState(
      "",
    );


  const [
    predictorOne,
    setPredictorOne,
  ] =
    useState(
      "",
    );


  const [
    predictorTwo,
    setPredictorTwo,
  ] =
    useState(
      "",
    );


  /* ========================================
     PAGE STATES
  ======================================== */

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


  /* ========================================
     LOAD DATASETS
  ======================================== */

  useEffect(
    () => {

      const loadDatasets =
        async () => {

          try {

            setLoadingDatasets(
              true,
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
     SELECTED DATASET
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
     LOAD SELECTED FILE
  ======================================== */

  const handleDatasetChange =
    async (
      datasetId:
        string,
    ) => {

      setSelectedDatasetId(
        datasetId,
      );


      setResponseVariable(
        "",
      );


      setPredictorOne(
        "",
      );


      setPredictorTwo(
        "",
      );


      setDatasetRows(
        [],
      );


      setNumericColumns(
        [],
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
            "No worksheet was found.",
          );

        }


        const worksheet =

          workbook
            .Sheets[
              worksheetName
            ];


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
            "The selected worksheet does not contain data.",
          );

        }


        const columns =

          Object.keys(
            rows[
              0
            ],
          );


        const detectedNumericColumns =

          columns.filter(
            (
              column,
            ) => {

              const validValues =

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
                validValues
                  .length ===
                0
              ) {

                return false;

              }


              const numericCount =

                validValues
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

                numericCount /

                validValues
                  .length

              ) >=
                0.8;

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
            "No numeric columns were found.",
          );

          setRegressionResult(
  null,
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



    /* ========================================
   MULTIPLE REGRESSION CALCULATION
======================================== */

const calculateMultipleRegression =
  (
    x1Values: number[],
    x2Values: number[],
    yValues: number[],
  ) => {

    const sampleSize =
      yValues.length;


    const sumX1 =
      x1Values.reduce(
        (
          total,
          value,
        ) =>
          total +
          value,
        0,
      );


    const sumX2 =
      x2Values.reduce(
        (
          total,
          value,
        ) =>
          total +
          value,
        0,
      );


    const sumY =
      yValues.reduce(
        (
          total,
          value,
        ) =>
          total +
          value,
        0,
      );


    const sumX1Squared =
      x1Values.reduce(
        (
          total,
          value,
        ) =>
          total +
          value *
          value,
        0,
      );


    const sumX2Squared =
      x2Values.reduce(
        (
          total,
          value,
        ) =>
          total +
          value *
          value,
        0,
      );


    const sumX1X2 =
      x1Values.reduce(
        (
          total,
          value,
          index,
        ) =>
          total +
          value *
          x2Values[
            index
          ],
        0,
      );


    const sumX1Y =
      x1Values.reduce(
        (
          total,
          value,
          index,
        ) =>
          total +
          value *
          yValues[
            index
          ],
        0,
      );


    const sumX2Y =
      x2Values.reduce(
        (
          total,
          value,
          index,
        ) =>
          total +
          value *
          yValues[
            index
          ],
        0,
      );


    /*
    Solve the three normal
    equations using determinants.
    */

    const determinant =

      sampleSize *

      (
        sumX1Squared *
          sumX2Squared -

        sumX1X2 *
          sumX1X2
      )

      -

      sumX1 *

      (
        sumX1 *
          sumX2Squared -

        sumX2 *
          sumX1X2
      )

      +

      sumX2 *

      (
        sumX1 *
          sumX1X2 -

        sumX2 *
          sumX1Squared
      );


    if (
      Math.abs(
        determinant,
      ) <
      0.0000000001
    ) {

      return null;

    }


    const interceptDeterminant =

      sumY *

      (
        sumX1Squared *
          sumX2Squared -

        sumX1X2 *
          sumX1X2
      )

      -

      sumX1 *

      (
        sumX1Y *
          sumX2Squared -

        sumX2Y *
          sumX1X2
      )

      +

      sumX2 *

      (
        sumX1Y *
          sumX1X2 -

        sumX2Y *
          sumX1Squared
      );


    const firstSlopeDeterminant =

      sampleSize *

      (
        sumX1Y *
          sumX2Squared -

        sumX2Y *
          sumX1X2
      )

      -

      sumY *

      (
        sumX1 *
          sumX2Squared -

        sumX2 *
          sumX1X2
      )

      +

      sumX2 *

      (
        sumX1 *
          sumX2Y -

        sumX2 *
          sumX1Y
      );


    const secondSlopeDeterminant =

      sampleSize *

      (
        sumX1Squared *
          sumX2Y -

        sumX1Y *
          sumX1X2
      )

      -

      sumX1 *

      (
        sumX1 *
          sumX2Y -

        sumX2 *
          sumX1Y
      )

      +

      sumY *

      (
        sumX1 *
          sumX1X2 -

        sumX2 *
          sumX1Squared
      );


    return {

      intercept:

        interceptDeterminant /
        determinant,

      firstSlope:

        firstSlopeDeterminant /
        determinant,

      secondSlope:

        secondSlopeDeterminant /
        determinant,

    };

  };



    /* ========================================
   SIMPLE LINEAR REGRESSION
======================================== */

const performRegression =
  async () => {

    setErrorMessage(
      "",
    );

    setRegressionResult(
      null,
    );


   if (
  !selectedDatasetId ||
  !responseVariable ||
  !predictorOne ||
  (
    regressionType ===
      "multiple" &&

    !predictorTwo
  )
) {

  setErrorMessage(

    regressionType ===
      "multiple"

      ? "Select a dataset, response variable, and both predictor variables."

      : "Select a dataset, response variable, and predictor variable.",

  );

  return;

}


  if (
  responseVariable ===
    predictorOne ||

  (
    regressionType ===
      "multiple" &&

    (
      responseVariable ===
        predictorTwo ||

      predictorOne ===
        predictorTwo
    )
  )
) {

  setErrorMessage(
    "The response and predictor variables must all be different.",
  );

  return;

}


    /*
    Keep only rows where
    both X and Y are valid.
    */

    const validRows =
  datasetRows

    .map(
      (
        row,
      ) => {

        return {

          x1:
            Number(
              row[
                predictorOne
              ],
            ),

          x2:
            regressionType ===
              "multiple"

              ? Number(
                  row[
                    predictorTwo
                  ],
                )

              : 0,

          y:
            Number(
              row[
                responseVariable
              ],
            ),

        };

      },
    )

    .filter(
      (
        row,
      ) =>

        Number.isFinite(
          row.x1,
        ) &&

        Number.isFinite(
          row.y,
        ) &&

        (
          regressionType ===
            "simple" ||

          Number.isFinite(
            row.x2,
          )
        ),

    );


    if (
      validRows.length <
      3
    ) {

      setErrorMessage(
        "At least three valid observations are required for regression analysis.",
      );

      return;

    }


    const predictorValues =
  validRows.map(
    (
      row,
    ) =>
      row.x1,
  );


const secondPredictorValues =
  validRows.map(
    (
      row,
    ) =>
      row.x2,
  );

    const actualValues =
      validRows.map(
        (
          row,
        ) =>
          row.y,
      );


    const sampleSize =
      validRows.length;


    /* ========================================
   COMMON VALUES
======================================== */

const meanY =

  actualValues.reduce(
    (
      total,
      value,
    ) =>
      total +
      value,
    0,
  ) /
  sampleSize;


/*
Values that will be filled
by either simple or multiple
regression.
*/

let intercept =
  0;

let slope =
  0;

let secondSlope:
  number |
  null =
    null;

let fittedValues:
  number[] =
    [];

let residuals:
  number[] =
    [];

let rSquared =
  0;

let residualStandardError =
  0;


/*
Coefficient statistics.

Multiple-regression standard
errors will be added later.
*/

let slopeStandardError =
  0;

let secondSlopeStandardError:
  number |
  null =
    null;


let interceptStandardError =
  0;

let slopeTValue =
  0;

let secondSlopeTValue:
  number |
  null =
    null;

let interceptTValue =
  0;

let slopePValue =
  1;

let secondSlopePValue:
  number |
  null =
    null;

let interceptPValue =
  1;


/* ========================================
   SIMPLE LINEAR REGRESSION
======================================== */

if (
  regressionType ===
  "simple"
) {

  const meanX =

    predictorValues.reduce(
      (
        total,
        value,
      ) =>
        total +
        value,
      0,
    ) /
    sampleSize;


  const numerator =

    validRows.reduce(
      (
        total,
        row,
      ) =>

        total +

        (
          row.x1 -
          meanX
        ) *

        (
          row.y -
          meanY
        ),

      0,
    );


  const denominator =

    predictorValues.reduce(
      (
        total,
        value,
      ) =>

        total +

        Math.pow(
          value -
          meanX,
          2,
        ),

      0,
    );


  if (
    denominator ===
    0
  ) {

    setErrorMessage(
      "Regression cannot be calculated because the selected predictor has no variation.",
    );

    return;

  }


  slope =

    numerator /
    denominator;


  intercept =

    meanY -

    slope *
    meanX;


  fittedValues =

    predictorValues.map(
      (
        predictorValue,
      ) =>

        intercept +

        slope *
        predictorValue,

    );


  residuals =

    actualValues.map(
      (
        actualValue,
        index,
      ) =>

        actualValue -

        fittedValues[
          index
        ],

    );


  const residualSumOfSquares =

    residuals.reduce(
      (
        total,
        residual,
      ) =>

        total +

        Math.pow(
          residual,
          2,
        ),

      0,
    );


  const totalSumOfSquares =

    actualValues.reduce(
      (
        total,
        value,
      ) =>

        total +

        Math.pow(
          value -
          meanY,
          2,
        ),

      0,
    );


  rSquared =

    totalSumOfSquares >
    0

      ? 1 -

        residualSumOfSquares /
        totalSumOfSquares

      : 1;


  residualStandardError =

    Math.sqrt(

      residualSumOfSquares /

      Math.max(
        sampleSize -
        2,
        1,
      ),

    );

  slopeStandardError =

    residualStandardError /

    Math.sqrt(
      denominator,
    );


  interceptStandardError =

    residualStandardError *

    Math.sqrt(

      1 /
      sampleSize +

      Math.pow(
        meanX,
        2,
      ) /
      denominator,

    );


  slopeTValue =

    slopeStandardError >
    0

      ? slope /
        slopeStandardError

      : 0;


  interceptTValue =

    interceptStandardError >
    0

      ? intercept /
        interceptStandardError

      : 0;


  slopePValue =

    calculateTwoSidedPValue(
      slopeTValue,
    );


  interceptPValue =

    calculateTwoSidedPValue(
      interceptTValue,
    );

}


/* ========================================
   MULTIPLE REGRESSION
======================================== */

else {

  const multipleResult =

    calculateMultipleRegression(

      predictorValues,

      secondPredictorValues,

      actualValues,

    );


  if (
    !multipleResult
  ) {

    setErrorMessage(
      "Multiple regression cannot be calculated. The selected predictors may be constant or too strongly related.",
    );

    return;

  }


  intercept =

    multipleResult
      .intercept;


  slope =

    multipleResult
      .firstSlope;


  secondSlope =

    multipleResult
      .secondSlope;


  fittedValues =

    predictorValues.map(
      (
        firstPredictorValue,
        index,
      ) =>

        intercept +

        slope *
        firstPredictorValue +

        secondSlope! *

        secondPredictorValues[
          index
        ],

    );


  residuals =

    actualValues.map(
      (
        actualValue,
        index,
      ) =>

        actualValue -

        fittedValues[
          index
        ],

    );


  const residualSumOfSquares =

    residuals.reduce(
      (
        total,
        residual,
      ) =>

        total +

        Math.pow(
          residual,
          2,
        ),

      0,
    );


  const totalSumOfSquares =

    actualValues.reduce(
      (
        total,
        value,
      ) =>

        total +

        Math.pow(
          value -
          meanY,
          2,
        ),

      0,
    );


  rSquared =

    totalSumOfSquares >
    0

      ? 1 -

        residualSumOfSquares /
        totalSumOfSquares

      : 1;


  /*
  Three parameters:
  intercept + two predictors.
  */

  residualStandardError =

    Math.sqrt(

      residualSumOfSquares /

      Math.max(
        sampleSize -
        3,
        1,
      ),

    );


  /*
  Calculate (XᵀX)⁻¹ diagonal values
  for the intercept and both predictors.
  */

  const sumX1 =
    predictorValues.reduce(
      (total, value) =>
        total + value,
      0,
    );

  const sumX2 =
    secondPredictorValues.reduce(
      (total, value) =>
        total + value,
      0,
    );

  const sumX1Squared =
    predictorValues.reduce(
      (total, value) =>
        total + value * value,
      0,
    );

  const sumX2Squared =
    secondPredictorValues.reduce(
      (total, value) =>
        total + value * value,
      0,
    );

  const sumX1X2 =
    predictorValues.reduce(
      (total, value, index) =>
        total +
        value *
        secondPredictorValues[index],
      0,
    );


  const matrixDeterminant =

    sampleSize *

    (
      sumX1Squared *
        sumX2Squared -

      sumX1X2 *
        sumX1X2
    )

    -

    sumX1 *

    (
      sumX1 *
        sumX2Squared -

      sumX2 *
        sumX1X2
    )

    +

    sumX2 *

    (
      sumX1 *
        sumX1X2 -

      sumX2 *
        sumX1Squared
    );


  if (
    Math.abs(
      matrixDeterminant,
    ) <
    0.0000000001
  ) {

    setErrorMessage(
      "Coefficient statistics cannot be calculated because the predictor matrix is singular.",
    );

    return;

  }


  const interceptInverseValue =

    (
      sumX1Squared *
        sumX2Squared -

      sumX1X2 *
        sumX1X2
    ) /

    matrixDeterminant;


  const firstSlopeInverseValue =

    (
      sampleSize *
        sumX2Squared -

      sumX2 *
        sumX2
    ) /

    matrixDeterminant;


  const secondSlopeInverseValue =

    (
      sampleSize *
        sumX1Squared -

      sumX1 *
        sumX1
    ) /

    matrixDeterminant;


  interceptStandardError =

    residualStandardError *

    Math.sqrt(
      Math.max(
        interceptInverseValue,
        0,
      ),
    );


  slopeStandardError =

    residualStandardError *

    Math.sqrt(
      Math.max(
        firstSlopeInverseValue,
        0,
      ),
    );


  secondSlopeStandardError =

    residualStandardError *

    Math.sqrt(
      Math.max(
        secondSlopeInverseValue,
        0,
      ),
    );


  interceptTValue =

    interceptStandardError > 0

      ? intercept /
        interceptStandardError

      : intercept !== 0

        ? Infinity

        : 0;


  slopeTValue =

    slopeStandardError > 0

      ? slope /
        slopeStandardError

      : slope !== 0

        ? Infinity

        : 0;


  secondSlopeTValue =

    secondSlopeStandardError > 0

      ? secondSlope /
        secondSlopeStandardError

      : secondSlope !== 0

        ? Infinity

        : 0;


  interceptPValue =

    calculateTwoSidedPValue(
      interceptTValue,
    );


  slopePValue =

    calculateTwoSidedPValue(
      slopeTValue,
    );


  secondSlopePValue =

    calculateTwoSidedPValue(
      secondSlopeTValue,
    );

}


    setRegressionResult({

      intercept,

      slope,

      secondSlope,

      interceptStandardError,

      slopeStandardError,

      secondSlopeStandardError,

      interceptTValue,

      slopeTValue,

      secondSlopeTValue,

      interceptPValue,

      slopePValue,

      secondSlopePValue,

      rSquared,

      residualStandardError,

      responseVariable,

      predictorVariable:
        predictorOne,

       secondPredictorVariable:

    regressionType ===
      "multiple"

      ? predictorTwo

      : null,


      actualValues,

      predictorValues,

      fittedValues,

      residuals,

      sampleSize,

    });


    /*
    Save Regression Analysis
    activity to Supabase.
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
              "regression_analysis",

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
            Save R-squared
            as a percentage.
            */

            result_value:

              rSquared *
              100,

            classification:

              rSquared >=
              0.7

                ? "good_fit"

                : rSquared >=
                    0.4

                  ? "moderate_fit"

                  : "weak_fit",

          });


      if (
        analysisHistoryError
      ) {

        console.error(
          "Unable to save regression analysis history:",
          analysisHistoryError,
        );

      }

    } catch (
      error
    ) {

      console.error(
        "Unable to save regression analysis history:",
        error,
      );

    }

  };


  /* ========================================
     PAGE
  ======================================== */

  return (

    <div className="regression-page">

      <Sidebar />

      <Header />


      <main className="regression-content">


        {/* PAGE HEADING */}

        <section className="regression-heading">

          <h1>
            Regression Analysis
          </h1>

          <p>
            Model relationships between
            response and predictor variables
          </p>

        </section>


        {/* CONFIGURATION */}

        <section className="regression-configuration-card">


          <h2>
            Regression Type
          </h2>


          {/* REGRESSION TABS */}

          <div className="regression-type-tabs">

            <button
              type="button"

              className={
                regressionType ===
                "simple"

                  ? "active"

                  : ""
              }

              onClick={
                () => {

                  setRegressionType(
                    "simple",
                  );


                  setPredictorTwo(
                    "",
                  );

                }
              }
            >

              Simple Linear Regression

            </button>


            <button
              type="button"

              className={
                regressionType ===
                "multiple"

                  ? "active"

                  : ""
              }

              onClick={
                () =>

                  setRegressionType(
                    "multiple",
                  )
              }
            >

              Multiple Regression

            </button>

          </div>


          <p className="regression-description">

            {
              regressionType ===
              "simple"

                ? "Model the relationship between one predictor and one response variable"

                : "Model the relationship between multiple predictors and one response variable"
            }

          </p>


          {/* VARIABLE SELECTION */}

          <div className="regression-selection-grid">


            {/* DATASET */}

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

                onChange={
                  (
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


            {/* RESPONSE */}

            <label>

              <span>
                Response Variable (Y)
              </span>


              <select

                value={
                  responseVariable
                }

                disabled={

                  loadingFile ||

                  numericColumns
                    .length ===
                    0

                }

                onChange={
                  (
                    event,
                  ) =>

                    setResponseVariable(
                      event
                        .target
                        .value,
                    )
                }
              >

                <option value="">

                  {
                    loadingFile

                      ? "Reading dataset..."

                      : "Choose response variable"
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


          {/* PREDICTORS */}

          <h2 className="predictor-heading">

            Predictor Variables (X)

          </h2>


          <div className="predictor-selection-grid">


            <label>

              <span>
                Predictor 1 (Required)
              </span>


              <select

                value={
                  predictorOne
                }

                disabled={

                  loadingFile ||

                  numericColumns
                    .length ===
                    0

                }

                onChange={
                  (
                    event,
                  ) =>

                    setPredictorOne(
                      event
                        .target
                        .value,
                    )
                }
              >

                <option value="">

                  Choose predictor

                </option>


                {
                  numericColumns

                    .filter(
                      (
                        column,
                      ) =>

                        column !==
                        responseVariable,
                    )

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

            </label>


            {
              regressionType ===
                "multiple" &&

              (

                <label>

                  <span>
                    Predictor 2
                  </span>


                  <select

                    value={
                      predictorTwo
                    }

                    onChange={
                      (
                        event,
                      ) =>

                        setPredictorTwo(
                          event
                            .target
                            .value,
                        )
                    }
                  >

                    <option value="">

                      Choose second predictor

                    </option>


                    {
                      numericColumns

                        .filter(
                          (
                            column,
                          ) =>

                            column !==
                              responseVariable &&

                            column !==
                              predictorOne,
                        )

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

                </label>

              )
            }


          </div>


          {/* BUTTON */}

          <button

            type="button"

            className="perform-regression-button"

            disabled={

  !selectedDatasetId ||

  !responseVariable ||

  !predictorOne ||

  (
    regressionType ===
      "multiple" &&

    !predictorTwo
  ) ||

  datasetRows
    .length ===
    0

}

            onClick={
  () =>
    void performRegression()
}

          >

            <Activity
              size={
                20
              }
            />

            Perform Regression Analysis

          </button>


          {
            errorMessage &&

            (

              <p className="regression-error">

                {
                  errorMessage
                }

              </p>

            )
          }


        </section>


        {/* REGRESSION RESULTS */}

{
  !regressionResult
    ? (
      <section className="regression-empty-card">

        <Database
          size={72}
        />

        <h2>
          No Regression Results
        </h2>

        <p>
          Select a dataset,
          response variable,
          and predictor variable,
          then perform the analysis.
        </p>

      </section>
    )
    : (
      <>

        {/* REGRESSION EQUATION */}

        <section className="regression-equation-card">

          <div className="regression-equation-heading">

            <Activity
              size={30}
            />

            <div>

              <h2>
                Regression Equation
              </h2>

              <p>

  {/* RESPONSE VARIABLE */}

  {
    regressionResult
      .responseVariable
  }

  {" = "}


  {/* INTERCEPT */}

  {
    regressionResult
      .intercept
      .toFixed(4)
  }


  {/* FIRST PREDICTOR */}

  {" "}

  {
    regressionResult
      .slope >=
    0

      ? "+"

      : "−"
  }

  {" "}

  {
    Math.abs(

      regressionResult
        .slope,

    ).toFixed(
      4,
    )
  }

  {" × "}

  {
    regressionResult
      .predictorVariable
  }


  {/* SECOND PREDICTOR */}

  {
    regressionResult
      .secondPredictorVariable &&

    regressionResult
      .secondSlope !==
      null &&

    (
      <>

        {" "}

        {
          regressionResult
            .secondSlope >=
          0

            ? "+"

            : "−"
        }

        {" "}

        {
          Math.abs(

            regressionResult
              .secondSlope,

          ).toFixed(
            4,
          )
        }

        {" × "}

        {
          regressionResult
            .secondPredictorVariable
        }

      </>
    )
  }

</p>

            </div>

          </div>


          <div className="regression-summary-grid">

            <article>

              <span>
                R-Squared
              </span>

              <strong>
                {
                  (
                    regressionResult
                      .rSquared *
                    100
                  ).toFixed(2)
                }
                %
              </strong>

            </article>


            <article>

              <span>
                Residual Standard Error
              </span>

              <strong>
                {
                  regressionResult
                    .residualStandardError
                    .toFixed(4)
                }
              </strong>

            </article>


            <article>

              <span>
                Observations
              </span>

              <strong>
                {
                  regressionResult
                    .sampleSize
                }
              </strong>

            </article>

          </div>

        </section>


        {/* REGRESSION COEFFICIENTS */}

<section className="regression-coefficients-card">

  <h2>
    Regression Coefficients
  </h2>

  <div className="regression-table-wrapper">

    <table className="regression-coefficients-table">

  <thead>

    <tr>

      <th>
        Variable
      </th>

      <th>
        Coefficient
      </th>

      <th>
        Std. Error
      </th>

      <th>
        t-value
      </th>

      <th>
        P-value
      </th>

      <th>
        Significance
      </th>

    </tr>

  </thead>


  <tbody>

    {/* INTERCEPT */}

    <tr>

      <td>
        Intercept
      </td>

      <td>
        {
          regressionResult
            .intercept
            .toFixed(4)
        }
      </td>

      <td>
        {
          regressionResult
            .interceptStandardError
            .toFixed(4)
        }
      </td>

      <td>
        {
          regressionResult
            .interceptTValue
            .toFixed(3)
        }
      </td>

      <td>
        {
          regressionResult
            .interceptPValue
            .toFixed(6)
        }
      </td>

      <td className="significance-value">

        {
          getSignificance(

            regressionResult
              .interceptPValue,

          )
        }

      </td>

    </tr>


    {/* PREDICTOR */}

    <tr>

      <td>

        {
          regressionResult
            .predictorVariable
        }

      </td>

      <td>

        {
          regressionResult
            .slope
            .toFixed(4)
        }

      </td>

      <td>

        {
          regressionResult
            .slopeStandardError
            .toFixed(4)
        }

      </td>

      <td>

        {
          regressionResult
            .slopeTValue
            .toFixed(3)
        }

      </td>

      <td>

        {
          regressionResult
            .slopePValue
            .toFixed(6)
        }

      </td>

      <td className="significance-value">

        {
          getSignificance(

            regressionResult
              .slopePValue,

          )
        }

      </td>

    </tr>

    {/* SECOND PREDICTOR */}

{
  regressionResult
    .secondPredictorVariable &&

  regressionResult
    .secondSlope !==
    null &&

  (

    <tr>

      {/* VARIABLE */}

      <td>

        {
          regressionResult
            .secondPredictorVariable
        }

      </td>


      {/* COEFFICIENT */}

      <td>

        {
          regressionResult
            .secondSlope
            .toFixed(
              4,
            )
        }

      </td>


      {/* STANDARD ERROR */}
{/* STANDARD ERROR */}

<td>

  {
    regressionResult
      .secondSlopeStandardError !==
    null

      ? regressionResult
          .secondSlopeStandardError
          .toFixed(
            4,
          )

      : "—"
  }

</td>


{/* T-VALUE */}

<td>

  {
    regressionResult
      .secondSlopeTValue !==
    null

      ? regressionResult
          .secondSlopeTValue
          .toFixed(
            3,
          )

      : "—"
  }

</td>


{/* P-VALUE */}

<td>

  {
    regressionResult
      .secondSlopePValue !==
    null

      ? regressionResult
          .secondSlopePValue
          .toFixed(
            6,
          )

      : "—"
  }

</td>


{/* SIGNIFICANCE */}

<td className="significance-value">

  {
    regressionResult
      .secondSlopePValue !==
    null

      ? getSignificance(

          regressionResult
            .secondSlopePValue,

        )

      : "—"
  }

</td>

    </tr>

  )
}

  </tbody>

</table>


<p className="significance-note">

  *** p &lt; 0.001 |{" "}

  ** p &lt; 0.01 |{" "}

  * p &lt; 0.05 |{" "}

  ns = not significant

</p>

  </div>

</section>

{/* MODEL FIT ASSESSMENT */}

<section className="model-fit-card">

  <div className="model-fit-heading">

    <div className="model-fit-icon">

      <Activity
        size={24}
      />

    </div>

    <h2>
      Model Fit Assessment
    </h2>

  </div>


  <p>

    <strong>

      R² ={" "}

      {
        (
          regressionResult
            .rSquared *
          100
        ).toFixed(
          2,
        )
      }
      %:

    </strong>

    {" "}

    {
      regressionResult
        .rSquared >=
      0.7

        ? "Good fit — the model explains a substantial portion of the variation in the response variable."

        : regressionResult
            .rSquared >=
          0.4

          ? "Moderate fit — the model explains part of the variation, but other factors may also affect the response variable."

          : "Weak fit — the model explains only a small portion of the variation in the response variable."
    }

  </p>


  <div className="model-fit-progress">

    <div
      className="model-fit-progress-value"

      style={{

        width:
          `${Math.max(
            0,
            Math.min(
              regressionResult
                .rSquared *
              100,
              100,
            ),
          )}%`,

      }}
    />

  </div>


  <div className="model-fit-scale">

    <span>
      Weak
    </span>

    <span>
      Moderate
    </span>

    <span>
      Good
    </span>

  </div>

</section>


{/* REGRESSION DIAGNOSTIC PLOTS */}

<section className="regression-plots-section">

  <h2>
    Regression Diagnostic Plots
  </h2>


  <div className="regression-plots-grid">


    {/* FITTED LINE PLOT */}

    <article className="regression-plot-card">

      <div className="regression-plot-heading">

        <h3>

  {
    regressionResult
      .secondPredictorVariable

      ? "Actual vs Predicted Plot"

      : "Fitted Line Plot"
  }

</h3>


<p>

  {
    regressionResult
      .secondPredictorVariable

      ? "Compare actual response values with model predictions"

      : "Observed values and fitted regression line"
  }

</p>
      </div>


      {
  regressionResult
    .secondPredictorVariable

    ? (

      /* ========================================
         MULTIPLE REGRESSION:
         ACTUAL VS PREDICTED
      ======================================== */

      <svg

        className="regression-svg-chart"

        viewBox="0 0 600 360"

        role="img"

        aria-label="Actual versus predicted values plot"

      >

        {(() => {

          const chartLeft =
            70;

          const chartRight =
            565;

          const chartTop =
            30;

          const chartBottom =
            295;


          /*
          Use the same scale for
          both axes so the diagonal
          reference line represents:

          Actual = Predicted
          */

          const allValues = [

            ...regressionResult
              .actualValues,

            ...regressionResult
              .fittedValues,

          ];


          const minimumValue =

            Math.min(
              ...allValues,
            );


          const maximumValue =

            Math.max(
              ...allValues,
            );


          const valueRange =

            maximumValue -
              minimumValue ||

            1;


          /*
          Add a small amount of
          space around the points.
          */

          const padding =

            valueRange *
            0.05;


          const scaleMinimum =

            minimumValue -
            padding;


          const scaleMaximum =

            maximumValue +
            padding;


          const scaleRange =

            scaleMaximum -
              scaleMinimum ||

            1;


          const scaleX =
            (
              value: number,
            ) =>

              chartLeft +

              (
                (
                  value -
                  scaleMinimum
                ) /

                scaleRange
              ) *

              (
                chartRight -
                chartLeft
              );


          const scaleY =
            (
              value: number,
            ) =>

              chartBottom -

              (
                (
                  value -
                  scaleMinimum
                ) /

                scaleRange
              ) *

              (
                chartBottom -
                chartTop
              );


          return (
            <>

              {/* HORIZONTAL GRID LINES */}

              {
                [
                  0,
                  1,
                  2,
                  3,
                  4,
                ].map(
                  (
                    gridIndex,
                  ) => {

                    const position =

                      chartTop +

                      (
                        gridIndex /
                        4
                      ) *

                      (
                        chartBottom -
                        chartTop
                      );


                    return (

                      <line

                        key={
                          `actual-predicted-horizontal-${gridIndex}`
                        }

                        x1={
                          chartLeft
                        }

                        y1={
                          position
                        }

                        x2={
                          chartRight
                        }

                        y2={
                          position
                        }

                        className="regression-grid-line"

                      />

                    );

                  },
                )
              }


              {/* VERTICAL GRID LINES */}

              {
                [
                  0,
                  1,
                  2,
                  3,
                  4,
                ].map(
                  (
                    gridIndex,
                  ) => {

                    const position =

                      chartLeft +

                      (
                        gridIndex /
                        4
                      ) *

                      (
                        chartRight -
                        chartLeft
                      );


                    return (

                      <line

                        key={
                          `actual-predicted-vertical-${gridIndex}`
                        }

                        x1={
                          position
                        }

                        y1={
                          chartTop
                        }

                        x2={
                          position
                        }

                        y2={
                          chartBottom
                        }

                        className="regression-grid-line"

                      />

                    );

                  },
                )
              }


              {/* AXES */}

              <line

                x1={
                  chartLeft
                }

                y1={
                  chartTop
                }

                x2={
                  chartLeft
                }

                y2={
                  chartBottom
                }

                className="regression-axis-line"

              />


              <line

                x1={
                  chartLeft
                }

                y1={
                  chartBottom
                }

                x2={
                  chartRight
                }

                y2={
                  chartBottom
                }

                className="regression-axis-line"

              />


              {/* PERFECT-PREDICTION LINE */}

              <line

                x1={
                  scaleX(
                    scaleMinimum,
                  )
                }

                y1={
                  scaleY(
                    scaleMinimum,
                  )
                }

                x2={
                  scaleX(
                    scaleMaximum,
                  )
                }

                y2={
                  scaleY(
                    scaleMaximum,
                  )
                }

                className="actual-predicted-reference-line"

              />


              {/* ACTUAL VS PREDICTED POINTS */}

              {
                regressionResult
                  .actualValues

                  .map(
                    (
                      actualValue,
                      index,
                    ) => (

                      <circle

                        key={
                          `actual-predicted-${index}`
                        }

                        cx={
                          scaleX(
                            actualValue,
                          )
                        }

                        cy={
                          scaleY(

                            regressionResult
                              .fittedValues[
                                index
                              ],

                          )
                        }

                        r="5"

                        className="actual-predicted-point"

                      />

                    ),
                  )
              }


              {/* X-AXIS LABEL */}

              <text

                x="317"

                y="340"

                className="regression-axis-label"

              >

                Actual Values

              </text>


              {/* Y-AXIS LABEL */}

              <text

                x="18"

                y="165"

                transform="rotate(-90 18 165)"

                className="regression-axis-label"

              >

                Predicted Values

              </text>

            </>
          );

        })()}

      </svg>

    )

    : (

      /* ========================================
         SIMPLE REGRESSION:
         KEEP EXISTING FITTED LINE
      ======================================== */

      <svg

        className="regression-svg-chart"

        viewBox="0 0 600 360"

        role="img"

        aria-label="Fitted regression line plot"

      >

        {

            <svg
        className="regression-svg-chart"
        viewBox="0 0 600 360"
        role="img"
        aria-label="Fitted regression line plot"
      >

        {(() => {

          const chartLeft =
            70;

          const chartRight =
            565;

          const chartTop =
            30;

          const chartBottom =
            295;


          const xMinimum =
            Math.min(
              ...regressionResult
                .predictorValues,
            );

          const xMaximum =
            Math.max(
              ...regressionResult
                .predictorValues,
            );


          const allYValues = [
            ...regressionResult
              .actualValues,

            ...regressionResult
              .fittedValues,
          ];


          const yMinimum =
            Math.min(
              ...allYValues,
            );

          const yMaximum =
            Math.max(
              ...allYValues,
            );


          const xRange =
            xMaximum -
              xMinimum ||
            1;

          const yRange =
            yMaximum -
              yMinimum ||
            1;


          const scaleX =
            (
              value: number,
            ) =>

              chartLeft +

              (
                (
                  value -
                  xMinimum
                ) /
                xRange
              ) *

              (
                chartRight -
                chartLeft
              );


          const scaleY =
            (
              value: number,
            ) =>

              chartBottom -

              (
                (
                  value -
                  yMinimum
                ) /
                yRange
              ) *

              (
                chartBottom -
                chartTop
              );


          const sortedLinePoints =

            regressionResult
              .predictorValues

              .map(
                (
                  predictorValue,
                  index,
                ) => ({

                  x:
                    predictorValue,

                  fitted:

                    regressionResult
                      .fittedValues[
                        index
                      ],

                }),
              )

              .sort(
                (
                  first,
                  second,
                ) =>

                  first.x -
                  second.x,
              );


          const linePoints =

            sortedLinePoints

              .map(
                (
                  point,
                ) =>

                  `${scaleX(
                    point.x,
                  )},${scaleY(
                    point.fitted,
                  )}`,

              )

              .join(
                " ",
              );


          return (
            <>

              {/* GRID LINES */}

              {
                [
                  0,
                  1,
                  2,
                  3,
                  4,
                ].map(
                  (
                    gridIndex,
                  ) => {

                    const yPosition =

                      chartTop +

                      (
                        gridIndex /
                        4
                      ) *

                      (
                        chartBottom -
                        chartTop
                      );


                    return (

                      <line

                        key={
                          `fitted-grid-${gridIndex}`
                        }

                        x1={
                          chartLeft
                        }

                        y1={
                          yPosition
                        }

                        x2={
                          chartRight
                        }

                        y2={
                          yPosition
                        }

                        className="regression-grid-line"

                      />

                    );

                  },
                )
              }


              {/* AXES */}

              <line
                x1={chartLeft}
                y1={chartTop}
                x2={chartLeft}
                y2={chartBottom}
                className="regression-axis-line"
              />

              <line
                x1={chartLeft}
                y1={chartBottom}
                x2={chartRight}
                y2={chartBottom}
                className="regression-axis-line"
              />


              {/* FITTED LINE */}

              <polyline

                points={
                  linePoints
                }

                className="regression-fitted-line"

              />


              {/* OBSERVED POINTS */}

              {
                regressionResult
                  .predictorValues

                  .map(
                    (
                      predictorValue,
                      index,
                    ) => (

                      <circle

                        key={
                          `observed-${index}`
                        }

                        cx={
                          scaleX(
                            predictorValue,
                          )
                        }

                        cy={
                          scaleY(

                            regressionResult
                              .actualValues[
                                index
                              ],

                          )
                        }

                        r="5"

                        className="regression-observed-point"

                      />

                    ),
                  )
              }


              {/* AXIS LABELS */}

              <text
                x="317"
                y="340"
                className="regression-axis-label"
              >

                {
                  regressionResult
                    .predictorVariable
                }

              </text>


              <text

                x="18"

                y="165"

                transform="rotate(-90 18 165)"

                className="regression-axis-label"

              >

                {
                  regressionResult
                    .responseVariable
                }

              </text>

            </>
          );

        })()}

      </svg>

        

        }

      </svg>

    )
}


      {
  regressionResult
    .secondPredictorVariable

    ? (

      <div className="regression-chart-legend">

        <span>

          <i className="actual-predicted-marker" />

          Actual vs Predicted

        </span>


        <span>

          <i className="perfect-fit-marker" />

          Perfect Prediction

        </span>

      </div>

    )

    : (

      <div className="regression-chart-legend">

        <span>

          <i className="observed-legend-marker" />

          Observed Values

        </span>


        <span>

          <i className="fitted-legend-marker" />

          Fitted Line

        </span>

      </div>

    )
}

    </article>


    {/* RESIDUALS VS FITTED */}

    <article className="regression-plot-card">

      <div className="regression-plot-heading">

        <h3>
          Residuals vs Fitted Values
        </h3>

        <p>
          Check for non-linearity and
          unequal variance
        </p>

      </div>


      <svg
        className="regression-svg-chart"
        viewBox="0 0 600 360"
        role="img"
        aria-label="Residuals versus fitted values plot"
      >

        {(() => {

          const chartLeft =
            70;

          const chartRight =
            565;

          const chartTop =
            30;

          const chartBottom =
            295;


          const fittedMinimum =
            Math.min(
              ...regressionResult
                .fittedValues,
            );

          const fittedMaximum =
            Math.max(
              ...regressionResult
                .fittedValues,
            );


          const maximumResidual =

            Math.max(

              ...regressionResult
                .residuals

                .map(
                  (
                    residual,
                  ) =>

                    Math.abs(
                      residual,
                    ),
                ),

              1,

            );


          const fittedRange =

            fittedMaximum -
              fittedMinimum ||

            1;


          const scaleX =
            (
              value: number,
            ) =>

              chartLeft +

              (
                (
                  value -
                  fittedMinimum
                ) /
                fittedRange
              ) *

              (
                chartRight -
                chartLeft
              );


          const scaleY =
            (
              value: number,
            ) =>

              chartBottom -

              (
                (
                  value +
                  maximumResidual
                ) /

                (
                  maximumResidual *
                  2
                )
              ) *

              (
                chartBottom -
                chartTop
              );


          const zeroLineY =
            scaleY(
              0,
            );


          return (
            <>

              {/* GRID LINES */}

              {
                [
                  0,
                  1,
                  2,
                  3,
                  4,
                ].map(
                  (
                    gridIndex,
                  ) => {

                    const yPosition =

                      chartTop +

                      (
                        gridIndex /
                        4
                      ) *

                      (
                        chartBottom -
                        chartTop
                      );


                    return (

                      <line

                        key={
                          `residual-grid-${gridIndex}`
                        }

                        x1={
                          chartLeft
                        }

                        y1={
                          yPosition
                        }

                        x2={
                          chartRight
                        }

                        y2={
                          yPosition
                        }

                        className="regression-grid-line"

                      />

                    );

                  },
                )
              }


              {/* AXES */}

              <line
                x1={chartLeft}
                y1={chartTop}
                x2={chartLeft}
                y2={chartBottom}
                className="regression-axis-line"
              />

              <line
                x1={chartLeft}
                y1={chartBottom}
                x2={chartRight}
                y2={chartBottom}
                className="regression-axis-line"
              />


              {/* ZERO REFERENCE LINE */}

              <line

                x1={
                  chartLeft
                }

                y1={
                  zeroLineY
                }

                x2={
                  chartRight
                }

                y2={
                  zeroLineY
                }

                className="residual-zero-line"

              />


              {/* RESIDUAL POINTS */}

              {
                regressionResult
                  .fittedValues

                  .map(
                    (
                      fittedValue,
                      index,
                    ) => (

                      <circle

                        key={
                          `residual-${index}`
                        }

                        cx={
                          scaleX(
                            fittedValue,
                          )
                        }

                        cy={
                          scaleY(

                            regressionResult
                              .residuals[
                                index
                              ],

                          )
                        }

                        r="5"

                        className="regression-residual-point"

                      />

                    ),
                  )
              }


              {/* AXIS LABELS */}

              <text
                x="317"
                y="340"
                className="regression-axis-label"
              >

                Fitted Values

              </text>


              <text

                x="18"

                y="165"

                transform="rotate(-90 18 165)"

                className="regression-axis-label"

              >

                Residuals

              </text>

            </>
          );

        })()}

      </svg>


      <p className="regression-plot-note">

        Residuals should be randomly
        scattered around the zero line.

      </p>

    </article>

    {/* NORMAL Q-Q PLOT */}

<article className="regression-plot-card">

  <div className="regression-plot-heading">

    <h3>
      Normal Q-Q Plot
    </h3>

    <p>
      Check whether residuals follow
      a normal distribution
    </p>

  </div>


  <svg
    className="regression-svg-chart"
    viewBox="0 0 600 360"
    role="img"
    aria-label="Normal Q-Q plot"
  >

    {(() => {

      const chartLeft =
        70;

      const chartRight =
        565;

      const chartTop =
        30;

      const chartBottom =
        295;


      /*
      Sort residuals from
      smallest to largest.
      */

      const sortedResiduals =

        [
          ...regressionResult
            .residuals,
        ].sort(
          (
            first,
            second,
          ) =>

            first -
            second,
        );


      const observationCount =

        sortedResiduals
          .length;


      /*
      Approximate theoretical
      normal quantiles.

      This approximation is
      suitable for displaying
      the Q-Q diagnostic plot.
      */

      const theoreticalQuantiles =

        sortedResiduals.map(
          (
            _,
            index,
          ) => {

            const probability =

              (
                index +
                0.5
              ) /

              observationCount;


            /*
            Logistic approximation
            to normal quantiles.
            */

            return (

              Math.log(

                probability /

                (
                  1 -
                  probability
                ),

              ) /

              1.7

            );

          },
        );


      const theoreticalMinimum =

        Math.min(
          ...theoreticalQuantiles,
        );


      const theoreticalMaximum =

        Math.max(
          ...theoreticalQuantiles,
        );


      const residualMinimum =

        Math.min(
          ...sortedResiduals,
        );


      const residualMaximum =

        Math.max(
          ...sortedResiduals,
        );


      const theoreticalRange =

        theoreticalMaximum -
          theoreticalMinimum ||

        1;


      const residualRange =

        residualMaximum -
          residualMinimum ||

        1;


      const scaleX =
        (
          value: number,
        ) =>

          chartLeft +

          (
            (
              value -
              theoreticalMinimum
            ) /

            theoreticalRange
          ) *

          (
            chartRight -
            chartLeft
          );


      const scaleY =
        (
          value: number,
        ) =>

          chartBottom -

          (
            (
              value -
              residualMinimum
            ) /

            residualRange
          ) *

          (
            chartBottom -
            chartTop
          );


      return (
        <>

          {/* GRID LINES */}

          {
            [
              0,
              1,
              2,
              3,
              4,
            ].map(
              (
                gridIndex,
              ) => {

                const position =

                  chartTop +

                  (
                    gridIndex /
                    4
                  ) *

                  (
                    chartBottom -
                    chartTop
                  );


                return (

                  <line

                    key={
                      `qq-grid-${gridIndex}`
                    }

                    x1={
                      chartLeft
                    }

                    y1={
                      position
                    }

                    x2={
                      chartRight
                    }

                    y2={
                      position
                    }

                    className="regression-grid-line"

                  />

                );

              },
            )
          }


          {/* AXES */}

          <line

            x1={
              chartLeft
            }

            y1={
              chartTop
            }

            x2={
              chartLeft
            }

            y2={
              chartBottom
            }

            className="regression-axis-line"

          />


          <line

            x1={
              chartLeft
            }

            y1={
              chartBottom
            }

            x2={
              chartRight
            }

            y2={
              chartBottom
            }

            className="regression-axis-line"

          />


          {/* NORMAL REFERENCE LINE */}

          <line

            x1={
              chartLeft
            }

            y1={
              chartBottom
            }

            x2={
              chartRight
            }

            y2={
              chartTop
            }

            className="qq-reference-line"

          />


          {/* Q-Q POINTS */}

          {
            sortedResiduals.map(
              (
                residual,
                index,
              ) => (

                <circle

                  key={
                    `qq-point-${index}`
                  }

                  cx={
                    scaleX(

                      theoreticalQuantiles[
                        index
                      ],

                    )
                  }

                  cy={
                    scaleY(
                      residual,
                    )
                  }

                  r="5"

                  className="qq-plot-point"

                />

              ),
            )
          }


          {/* AXIS LABELS */}

          <text

            x="317"

            y="340"

            className="regression-axis-label"

          >

            Theoretical Quantiles

          </text>


          <text

            x="18"

            y="165"

            transform="rotate(-90 18 165)"

            className="regression-axis-label"

          >

            Standardized Residuals

          </text>

        </>
      );

    })()}

  </svg>


  <p className="regression-plot-note">

    Points close to the reference
    line indicate approximately
    normal residuals.

  </p>

</article>


{/* SCALE-LOCATION PLOT */}

<article className="regression-plot-card">

  <div className="regression-plot-heading">

    <h3>
      Scale-Location Plot
    </h3>

    <p>
      Check whether residual variance
      remains approximately constant
    </p>

  </div>


  <svg
    className="regression-svg-chart"
    viewBox="0 0 600 360"
    role="img"
    aria-label="Scale-location plot"
  >

    {(() => {

      const chartLeft =
        70;

      const chartRight =
        565;

      const chartTop =
        30;

      const chartBottom =
        295;


      const fittedMinimum =

        Math.min(

          ...regressionResult
            .fittedValues,

        );


      const fittedMaximum =

        Math.max(

          ...regressionResult
            .fittedValues,

        );


      const fittedRange =

        fittedMaximum -
          fittedMinimum ||

        1;


      /*
      Standardize residuals using
      residual standard error.
      */

      const scaleLocationValues =

        regressionResult
          .residuals

          .map(
            (
              residual,
            ) => {

              const standardizedResidual =

                regressionResult
                  .residualStandardError >
                0

                  ? residual /

                    regressionResult
                      .residualStandardError

                  : 0;


              return Math.sqrt(

                Math.abs(
                  standardizedResidual,
                ),

              );

            },
          );


      const maximumScaleValue =

        Math.max(

          ...scaleLocationValues,

          1,

        );


      const scaleX =
        (
          value: number,
        ) =>

          chartLeft +

          (
            (
              value -
              fittedMinimum
            ) /

            fittedRange
          ) *

          (
            chartRight -
            chartLeft
          );


      const scaleY =
        (
          value: number,
        ) =>

          chartBottom -

          (
            value /

            maximumScaleValue
          ) *

          (
            chartBottom -
            chartTop
          );


      /*
      Create a simple trend line
      through the scale values.
      */

      const trendPoints =

        regressionResult
          .fittedValues

          .map(
            (
              fittedValue,
              index,
            ) => ({

              fittedValue,

              scaleValue:

                scaleLocationValues[
                  index
                ],

            }),
          )

          .sort(
            (
              first,
              second,
            ) =>

              first
                .fittedValue -

              second
                .fittedValue,
          );


      const trendLinePoints =

        trendPoints

          .map(
            (
              point,
            ) =>

              `${scaleX(
                point.fittedValue,
              )},${scaleY(
                point.scaleValue,
              )}`,

          )

          .join(
            " ",
          );


      return (
        <>

          {/* GRID LINES */}

          {
            [
              0,
              1,
              2,
              3,
              4,
            ].map(
              (
                gridIndex,
              ) => {

                const position =

                  chartTop +

                  (
                    gridIndex /
                    4
                  ) *

                  (
                    chartBottom -
                    chartTop
                  );


                return (

                  <line

                    key={
                      `scale-grid-${gridIndex}`
                    }

                    x1={
                      chartLeft
                    }

                    y1={
                      position
                    }

                    x2={
                      chartRight
                    }

                    y2={
                      position
                    }

                    className="regression-grid-line"

                  />

                );

              },
            )
          }


          {/* AXES */}

          <line

            x1={
              chartLeft
            }

            y1={
              chartTop
            }

            x2={
              chartLeft
            }

            y2={
              chartBottom
            }

            className="regression-axis-line"

          />


          <line

            x1={
              chartLeft
            }

            y1={
              chartBottom
            }

            x2={
              chartRight
            }

            y2={
              chartBottom
            }

            className="regression-axis-line"

          />


          {/* TREND LINE */}

          <polyline

            points={
              trendLinePoints
            }

            className="scale-location-trend-line"

          />


          {/* SCALE-LOCATION POINTS */}

          {
            regressionResult
              .fittedValues

              .map(
                (
                  fittedValue,
                  index,
                ) => (

                  <circle

                    key={
                      `scale-location-${index}`
                    }

                    cx={
                      scaleX(
                        fittedValue,
                      )
                    }

                    cy={
                      scaleY(

                        scaleLocationValues[
                          index
                        ],

                      )
                    }

                    r="5"

                    className="scale-location-point"

                  />

                ),
              )
          }


          {/* AXIS LABELS */}

          <text

            x="317"

            y="340"

            className="regression-axis-label"

          >

            Fitted Values

          </text>


          <text

            x="18"

            y="165"

            transform="rotate(-90 18 165)"

            className="regression-axis-label"

          >

            √|Standardized Residuals|

          </text>

        </>
      );

    })()}

  </svg>


  <p className="regression-plot-note">

    A roughly horizontal pattern
    indicates approximately constant
    residual variance.

  </p>

</article>

  </div>

</section>


{/* REGRESSION ASSUMPTIONS CHECK */}

<section className="regression-assumptions-card">

  <h2>
    Regression Assumptions Check
  </h2>


  <div className="regression-assumptions-grid">


    {/* LINEARITY */}

    <article className="assumption-check-item">

      <div className="assumption-check-icon passed">

        ✓

      </div>


      <div>

        <h3>
          Linearity
        </h3>

        <p>
          {
            regressionResult
              .rSquared >=
            0.4

              ? "The fitted relationship shows an acceptable linear pattern."

              : "The linear relationship is weak. Review the fitted-line and residual plots."
          }
        </p>

      </div>


      <span
        className={

          regressionResult
            .rSquared >=
          0.4

            ? "assumption-status passed"

            : "assumption-status warning"

        }
      >

        {
          regressionResult
            .rSquared >=
          0.4

            ? "Passed"

            : "Review"
        }

      </span>

    </article>


    {/* INDEPENDENCE */}

    <article className="assumption-check-item">

      <div className="assumption-check-icon passed">

        ✓

      </div>


      <div>

        <h3>
          Independence
        </h3>

        <p>
          Observations are assumed to be
          independent based on the selected
          dataset structure.
        </p>

      </div>


      <span className="assumption-status passed">

        Assumed

      </span>

    </article>


    {/* NORMALITY */}

    <article className="assumption-check-item">

      <div
        className={

          regressionResult
            .residuals
            .length >=
          8

            ? "assumption-check-icon passed"

            : "assumption-check-icon warning"

        }
      >

        {
          regressionResult
            .residuals
            .length >=
          8

            ? "✓"

            : "!"
        }

      </div>


      <div>

        <h3>
          Normality of Residuals
        </h3>

        <p>

          {
            regressionResult
              .residuals
              .length >=
            8

              ? "Use the Normal Q-Q plot to confirm that the residual points remain close to the reference line."

              : "The sample is small. Interpret the residual normality assessment carefully."
          }

        </p>

      </div>


      <span
        className={

          regressionResult
            .residuals
            .length >=
          8

            ? "assumption-status passed"

            : "assumption-status warning"

        }
      >

        {
          regressionResult
            .residuals
            .length >=
          8

            ? "Acceptable"

            : "Review"
        }

      </span>

    </article>


    {/* CONSTANT VARIANCE */}

    <article className="assumption-check-item">

      <div className="assumption-check-icon passed">

        ✓

      </div>


      <div>

        <h3>
          Constant Variance
        </h3>

        <p>
          Review the Residuals vs Fitted
          and Scale-Location plots for a
          consistent residual spread.
        </p>

      </div>


      <span className="assumption-status passed">

        Acceptable

      </span>

    </article>


    {/* OUTLIERS */}

    <article className="assumption-check-item">

      <div
        className={

          regressionResult
            .residuals
            .some(

              (
                residual,
              ) =>

                Math.abs(
                  residual,
                ) >

                regressionResult
                  .residualStandardError *
                3,

            )

            ? "assumption-check-icon warning"

            : "assumption-check-icon passed"

        }
      >

        {

          regressionResult
            .residuals
            .some(

              (
                residual,
              ) =>

                Math.abs(
                  residual,
                ) >

                regressionResult
                  .residualStandardError *
                3,

            )

            ? "!"

            : "✓"

        }

      </div>


      <div>

        <h3>
          Potential Outliers
        </h3>

        <p>

          {

            regressionResult
              .residuals
              .some(

                (
                  residual,
                ) =>

                  Math.abs(
                    residual,
                  ) >

                  regressionResult
                    .residualStandardError *
                  3,

              )

              ? "One or more observations have residuals greater than three residual standard errors."

              : "No extreme residuals greater than three residual standard errors were detected."

          }

        </p>

      </div>


      <span
        className={

          regressionResult
            .residuals
            .some(

              (
                residual,
              ) =>

                Math.abs(
                  residual,
                ) >

                regressionResult
                  .residualStandardError *
                3,

            )

            ? "assumption-status warning"

            : "assumption-status passed"

        }
      >

        {

          regressionResult
            .residuals
            .some(

              (
                residual,
              ) =>

                Math.abs(
                  residual,
                ) >

                regressionResult
                  .residualStandardError *
                3,

            )

            ? "Review"

            : "Passed"

        }

      </span>

    </article>

  </div>

</section>

      </>
    )
}


      </main>

    </div>

  );

}


export default RegressionAnalysis;