import {
  Activity,
  BarChart3,
  BrainCircuit,
  Calculator,
  ChartNoAxesCombined,
  CircleCheck,
  Clock3,
  Database,
  FileChartColumn,
  FileText,
  FolderOpen,
  Grid2X2,
  Lightbulb,
  Network,
  Sigma,
  Sparkles,
  TrendingUp,
  Upload,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import Sidebar from "../../components/layout/Sidebar";
import Header from "../../components/layout/Header";
import { supabase } from "../../lib/supabase";
import "./Dashboard.css";


function Dashboard() {
  const [
    datasetCount,
    setDatasetCount,
  ] = useState(0);

  const [
    isLoadingDatasets,
    setIsLoadingDatasets,
  ] = useState(true);

  const [
  analysisCount,
  setAnalysisCount,
] = useState(0);

const [
  isLoadingAnalyses,
  setIsLoadingAnalyses,
] = useState(true);

const [
  capableCount,
  setCapableCount,
] = useState(0);

const [
  marginalCount,
  setMarginalCount,
] = useState(0);

const [
  needsImprovementCount,
  setNeedsImprovementCount,
] = useState(0);

const [
  monthlyUploadData,
  setMonthlyUploadData,
] = useState<
  {
    month: string;
    uploads: number;
  }[]
>([]);

const [
  analysisActivity,
  setAnalysisActivity,
] = useState({
  descriptive_statistics: 0,
  graphical_summary: 0,
  process_capability: 0,
  capability_six_pack: 0,
  regression_analysis: 0,
  anova: 0,
});

  /*
  Load the real number of uploaded
  datasets from Supabase.
  */

  useEffect(() => {
    const loadDatasetCount =
      async () => {
        try {
          setIsLoadingDatasets(
            true,
          );

          const {
            count,
            error,
          } = await supabase
            .from("datasets")
            .select(
              "*",
              {
                count: "exact",
                head: true,
              },
            );

          if (error) {
            throw error;
          }

          setDatasetCount(
            count ?? 0,
          );
        } catch (error) {
          console.error(
            "Dashboard dataset count error:",
            error,
          );

          setDatasetCount(
            0,
          );
        } finally {
          setIsLoadingDatasets(
            false,
          );
        }
      };

    void loadAnalysisActivity();

    void loadDatasetUploadTrend();

    void loadCapabilityCounts();  

    void loadAnalysisCount();  

    void loadDatasetCount();
  }, []);


  const loadAnalysisCount =
  async () => {
    try {
      setIsLoadingAnalyses(
        true,
      );

      const {
        count,
        error,
      } = await supabase
        .from(
          "analysis_history",
        )
        .select(
          "id",
          {
            count:
              "exact",

            head:
              true,
          },
        );

      if (error) {
        throw error;
      }

      setAnalysisCount(
        count ?? 0,
      );

    } catch (error) {
      console.error(
        "Unable to load analysis count:",
        error,
      );

      setAnalysisCount(
        0,
      );

    } finally {
      setIsLoadingAnalyses(
        false,
      );
    }
  };

  const loadCapabilityCounts =
  async () => {
    try {
      const {
        data,
        error,
      } = await supabase
        .from(
          "analysis_history",
        )
        .select(
          "classification",
        )
        .eq(
          "analysis_type",
          "process_capability",
        );

      if (error) {
        throw error;
      }

      const classifications =
        (
          data ?? []
        ).map(
          (record) =>
            String(
              record
                .classification ??
              "",
            )
              .trim()
              .toLowerCase(),
        );


      /*
      Excellent and adequate
      processes are capable.
      */

      const capable =
        classifications.filter(
          (
            classification,
          ) =>
            classification ===
              "excellent" ||
            classification ===
              "adequate" ||
            classification ===
              "capable",
        ).length;


      /*
      Cpk from 1.00 to
      below 1.33.
      */

      const marginal =
        classifications.filter(
          (
            classification,
          ) =>
            classification ===
            "marginal",
        ).length;


      /*
      Cpk below 1.00.
      */

      const needsImprovement =
        classifications.filter(
          (
            classification,
          ) =>
            classification ===
              "inadequate" ||
            classification ===
              "needs_improvement",
        ).length;


      setCapableCount(
        capable,
      );

      setMarginalCount(
        marginal,
      );

      setNeedsImprovementCount(
        needsImprovement,
      );

    } catch (error) {
      console.error(
        "Unable to load capability counts:",
        error,
      );

      setCapableCount(
        0,
      );

      setMarginalCount(
        0,
      );

      setNeedsImprovementCount(
        0,
      );
    }
  };

  const loadDatasetUploadTrend =
  async () => {
    try {
      const {
        data,
        error,
      } = await supabase
        .from(
          "datasets",
        )
        .select(
          "created_at",
        )
        .not(
          "created_at",
          "is",
          null,
        );

      if (error) {
        throw error;
      }

      const currentDate =
        new Date();

      const lastSixMonths =
        Array.from(
          {
            length: 6,
          },
          (
            _,
            index,
          ) => {
            const date =
              new Date(
                currentDate
                  .getFullYear(),

                currentDate
                  .getMonth() -
                  (
                    5 -
                    index
                  ),

                1,
              );

            return {
              key:
                `${
                  date.getFullYear()
                }-${
                  String(
                    date.getMonth() +
                    1,
                  ).padStart(
                    2,
                    "0",
                  )
                }`,

              month:
                date.toLocaleString(
                  "en-US",
                  {
                    month:
                      "short",
                  },
                ),

              uploads:
                0,
            };
          },
        );


      (
        data ?? []
      ).forEach(
        (
          dataset,
        ) => {
          if (
            !dataset
              .created_at
          ) {
            return;
          }

          const uploadDate =
            new Date(
              dataset
                .created_at,
            );

          const uploadKey =
            `${
              uploadDate
                .getFullYear()
            }-${
              String(
                uploadDate
                  .getMonth() +
                  1,
              ).padStart(
                2,
                "0",
              )
            }`;


          const month =
            lastSixMonths
              .find(
                (
                  item,
                ) =>
                  item.key ===
                  uploadKey,
              );


          if (
            month
          ) {
            month.uploads +=
              1;
          }
        },
      );


      setMonthlyUploadData(
        lastSixMonths.map(
          (
            item,
          ) => ({
            month:
              item.month,

            uploads:
              item.uploads,
          }),
        ),
      );

    } catch (
      error
    ) {
      console.error(
        "Unable to load dataset upload trend:",
        error,
      );

      setMonthlyUploadData(
        [],
      );
    }
  };

  const loadAnalysisActivity =
  async () => {
    try {
      const {
        data,
        error,
      } = await supabase
        .from(
          "analysis_history",
        )
        .select(
          "analysis_type",
        );

      if (error) {
        throw error;
      }

      const activityCounts = {
        descriptive_statistics: 0,
        graphical_summary: 0,
        process_capability: 0,
        capability_six_pack: 0,
        regression_analysis: 0,
        anova: 0,
      };


      (
        data ?? []
      ).forEach(
        (analysis) => {

          const analysisType =
            String(
              analysis
                .analysis_type ??
              "",
            )
              .trim()
              .toLowerCase();


          if (
            analysisType in
            activityCounts
          ) {
            activityCounts[
              analysisType as keyof
                typeof activityCounts
            ] += 1;
          }

        },
      );


      setAnalysisActivity(
        activityCounts,
      );

    } catch (
      error
    ) {
      console.error(
        "Unable to load analysis activity:",
        error,
      );
    }
  };



  return (
    <div className="dashboard-page">
      {/* Sidebar */}

      <Sidebar />

      {/* Top Header */}

      <Header />

      {/* Main Dashboard Content */}

      <main className="dashboard-content">
        {/* Dashboard Heading */}

        <section className="dashboard-heading">
          <h1>Dashboard</h1>

          <p>
            Statistical Quality Analysis Platform — Rane (Madras) Limited
          </p>
        </section>

        {/* Analytics Tabs */}

        <section className="analytics-tabs">
          <button className="analytics-tab active">
            <Grid2X2 size={20} />

            <span>Overall Dashboard</span>
          </button>

          <button className="analytics-tab">
            <BarChart3 size={21} />

            <span>Plant-wise Analytics</span>
          </button>

          <button className="analytics-tab">
            <Network size={21} />

            <span>Product-wise Analytics</span>
          </button>
        </section>

        {/* Summary Cards */}

        <section className="summary-card-grid">
          {/* Datasets Uploaded */}

          <article className="summary-card">
            <div className="summary-information">
              <p>
                Datasets
                <br />
                Uploaded
              </p>

              <h2>
                {isLoadingDatasets
                ? "..."
                : datasetCount}
                </h2>
            </div>

            <div className="summary-icon database-icon">
              <Database size={29} />
            </div>
          </article>

          {/* Analyses Performed */}

          <article className="summary-card">
            <div className="summary-information">
              <p>
                Analyses
                <br />
                Performed
              </p>

              <h2>
  {isLoadingAnalyses
    ? "..."
    : analysisCount}
</h2>
            </div>

            <div className="summary-icon analysis-icon">
              <BarChart3 size={29} />
            </div>
          </article>

          {/* Active Projects */}

          <article className="summary-card">
            <div className="summary-information">
              <p>Active Projects</p>

              <h2>0</h2>
            </div>

            <div className="summary-icon project-icon">
              <FolderOpen size={29} />
            </div>
          </article>

          {/* Reports Generated */}

          <article className="summary-card">
            <div className="summary-information">
              <p>
                Reports
                <br />
                Generated
              </p>

              <h2>0</h2>
            </div>

            <div className="summary-icon report-icon">
              <FileText size={29} />
            </div>
          </article>
        </section>

        {/* Process Status Cards */}

        <section className="process-status-grid">
          {/* Capable Processes */}

          <article className="process-status-card capable-card">
            <div className="process-card-heading">
              <CircleCheck size={28} />

              <h2>{capableCount}</h2>
            </div>

            <div className="process-count capable-count">
              0
            </div>

            <p>
              Cp ≥ 1.33 · run capability analysis
            </p>
          </article>

          {/* Marginal Processes */}

          <article className="process-status-card marginal-card">
            <div className="process-card-heading">
              <Activity size={30} />

              <h2>{marginalCount}</h2>
            </div>

            <div className="process-count marginal-count">
              0
            </div>

            <p>
              1.0 ≤ Cp &lt; 1.33 · run capability analysis
            </p>
          </article>

          {/* Needs Improvement */}

          <article className="process-status-card improvement-card">
            <div className="process-card-heading">
              <TrendingUp size={29} />

              <h2>{needsImprovementCount}</h2>
            </div>

            <div className="process-count improvement-count">
              0
            </div>

            <p>
              Cp &lt; 1.0 · run capability analysis
            </p>
          </article>
        </section>

        {/* Dashboard Analytics */}

        <section className="dashboard-analytics-grid">
          {/* Dataset Upload Trend */}

          <article className="dashboard-chart-card">
            <div className="chart-card-header">
              <div>
                <h2>Dataset Upload Trend</h2>

                <p>
                  Monthly uploads over the last 6 months
                </p>
              </div>

              <div className="chart-header-icon upload-trend-icon">
                <Upload size={25} />
              </div>
            </div>

            {monthlyUploadData.some(
  (
    item,
  ) =>
    item.uploads > 0,
) ? (
  <div className="upload-trend-chart">

    {monthlyUploadData.map(
      (
        item,
      ) => {
        const maximumUploads =
          Math.max(
            ...monthlyUploadData.map(
              (
                month,
              ) =>
                month.uploads,
            ),
            1,
          );

        const barHeight =
          item.uploads === 0
            ? 0
            : Math.max(
                (
                  item.uploads /
                  maximumUploads
                ) *
                  180,

                20,
              );


        return (
          <div
            className="upload-trend-column"
            key={
              item.month
            }
          >

            <div className="upload-trend-value">
              {item.uploads}
            </div>

            <div className="upload-trend-bar-area">

              <div
                className="upload-trend-bar"
                style={{
                  height:
                    `${barHeight}px`,
                }}
              />

            </div>

            <span>
              {item.month}
            </span>

          </div>
        );
      },
    )}

  </div>
) : (
  <div className="upload-empty-state">

    <Upload size={48} />

    <h3>
      No upload data yet
    </h3>

    <p>
      Upload datasets to see
      monthly trends
    </p>

  </div>
)}
          </article>

          {/* Process Capability Distribution */}

          <article className="dashboard-chart-card">
            <div className="chart-card-header">
              <div>
                <h2>Process Capability Distribution</h2>

                <p>
                  Capability classification across all analyses
                </p>
              </div>

              <div className="chart-header-icon capability-chart-icon">
                <BarChart3 size={25} />
              </div>
            </div>

            {analysisCount === 0 ? (
  <div className="capability-empty-state">
    <BarChart3 size={48} />

    <h3>
      No capability data yet
    </h3>

    <p>
      Run process capability analyses
      to populate this chart
    </p>
  </div>
) : (
  <div className="capability-distribution-content">

    <div className="capability-distribution-bar">

      <div
        className="capability-bar-section capable"
        style={{
          width:
            `${
              (
                capableCount /
                Math.max(
                  capableCount +
                  marginalCount +
                  needsImprovementCount,
                  1,
                )
              ) *
              100
            }%`,
        }}
      />

      <div
        className="capability-bar-section marginal"
        style={{
          width:
            `${
              (
                marginalCount /
                Math.max(
                  capableCount +
                  marginalCount +
                  needsImprovementCount,
                  1,
                )
              ) *
              100
            }%`,
        }}
      />

      <div
        className="capability-bar-section improvement"
        style={{
          width:
            `${
              (
                needsImprovementCount /
                Math.max(
                  capableCount +
                  marginalCount +
                  needsImprovementCount,
                  1,
                )
              ) *
              100
            }%`,
        }}
      />

    </div>


    <div className="capability-distribution-list">

      <div className="capability-distribution-item">

        <span className="capability-dot capable" />

        <div>
          <strong>
            Capable
          </strong>

          <p>
            Cpk ≥ 1.33
          </p>
        </div>

        <strong>
          {capableCount}
        </strong>

      </div>


      <div className="capability-distribution-item">

        <span className="capability-dot marginal" />

        <div>
          <strong>
            Marginal
          </strong>

          <p>
            1.00 ≤ Cpk &lt; 1.33
          </p>
        </div>

        <strong>
          {marginalCount}
        </strong>

      </div>


      <div className="capability-distribution-item">

        <span className="capability-dot improvement" />

        <div>
          <strong>
            Needs Improvement
          </strong>

          <p>
            Cpk &lt; 1.00
          </p>
        </div>

        <strong>
          {needsImprovementCount}
        </strong>

      </div>

    </div>

  </div>
)}
          </article>
        </section>

        {/* Analysis Activity Overview */}

        <section className="analysis-overview-section">
          <div className="analysis-overview-header">
            <div>
              <h2>Analysis Activity Overview</h2>

              <p>
                Track usage across statistical and quality
                analysis tools
              </p>
            </div>

            <div className="analysis-overview-icon">
              <Activity size={25} />
            </div>
          </div>

          <div className="analysis-activity-grid">
            {/* Descriptive Statistics */}

            <article className="analysis-activity-card">
              <div className="activity-icon descriptive-icon">
                <Calculator size={28} />
              </div>

              <div className="activity-information">
                <h3>Descriptive Statistics</h3>

                <p>
                  Basic statistical summaries
                </p>
              </div>

              <div className="activity-count">
                <strong>{analysisActivity.descriptive_statistics}</strong>

                <span>Analyses</span>
              </div>
            </article>

            {/* Graphical Summary */}

            <article className="analysis-activity-card">
              <div className="activity-icon graphical-icon">
                <BarChart3 size={28} />
              </div>

              <div className="activity-information">
                <h3>Graphical Summary</h3>

                <p>
                  Visual data exploration
                </p>
              </div>

              <div className="activity-count">
                <strong>{analysisActivity.graphical_summary}</strong>

                <span>Analyses</span>
              </div>
            </article>

            {/* Process Capability */}

            <article className="analysis-activity-card">
              <div className="activity-icon capability-icon">
                <ChartNoAxesCombined size={28} />
              </div>

              <div className="activity-information">
                <h3>Process Capability</h3>

                <p>
                  Cp, Cpk, Pp and Ppk analysis
                </p>
              </div>

              <div className="activity-count">
                <strong>{analysisActivity.process_capability}</strong>

                <span>Analyses</span>
              </div>
            </article>

            {/* Capability Six Pack */}

            <article className="analysis-activity-card">
              <div className="activity-icon six-pack-icon">
                <FileChartColumn size={28} />
              </div>

              <div className="activity-information">
                <h3>Capability Six Pack</h3>

                <p>
                  Complete process assessment
                </p>
              </div>

              <div className="activity-count">
                <strong>{analysisActivity.capability_six_pack}</strong>

                <span>Analyses</span>
              </div>
            </article>

            {/* Regression Analysis */}

            <article className="analysis-activity-card">
              <div className="activity-icon regression-icon">
                <TrendingUp size={28} />
              </div>

              <div className="activity-information">
                <h3>Regression Analysis</h3>

                <p>
                  Relationship and prediction models
                </p>
              </div>

              <div className="activity-count">
                <strong>{analysisActivity.regression_analysis}</strong>

                <span>Analyses</span>
              </div>
            </article>

            {/* ANOVA */}

            <article className="analysis-activity-card">
              <div className="activity-icon anova-icon">
                <Sigma size={28} />
              </div>

              <div className="activity-information">
                <h3>ANOVA</h3>

                <p>
                  Compare group means and variation
                </p>
              </div>

              <div className="activity-count">
                <strong>{analysisActivity.anova}</strong>

                <span>Analyses</span>
              </div>
            </article>
          </div>
        </section>

        {/* AI Insights Summary */}

        <section className="ai-insights-section">
          <div className="ai-insights-header">
            <div className="ai-title-group">
              <div className="ai-main-icon">
                <BrainCircuit size={27} />
              </div>

              <div>
                <h2>AI Insights Summary</h2>

                <p>
                  Intelligent recommendations based on your
                  analysis activity
                </p>
              </div>
            </div>

            <div className="ai-badge">
              <Sparkles size={16} />

              <span>AI Powered</span>
            </div>
          </div>

          <div className="ai-empty-content">
            <div className="ai-empty-icon">
              <Lightbulb size={38} />
            </div>

            <h3>No insights available yet</h3>

            <p>
              Upload datasets and perform statistical analyses
              to receive intelligent quality insights and
              process recommendations.
            </p>
          </div>
        </section>

        {/* Recent Activity */}

        <section className="recent-activity-section">
          <div className="recent-activity-header">
            <div>
              <h2>Recent Activity</h2>

              <p>
                Your latest dataset uploads, analyses, and
                generated reports
              </p>
            </div>

            <div className="recent-activity-icon">
              <Clock3 size={25} />
            </div>
          </div>

          <div className="recent-activity-empty">
            <div className="activity-empty-icon">
              <Activity size={37} />
            </div>

            <h3>No recent activity</h3>

            <p>
              Your latest uploads and statistical analyses
              will appear here.
            </p>
          </div>
        </section>

        {/* Dashboard Footer */}

        <footer className="dashboard-footer">
          <p>
            © 2026 Rane (Madras) Limited · Brake Components
            Division
          </p>

          <span>
            Statistical Quality Analysis Platform
          </span>
        </footer>
      </main>
    </div>
  );
}

export default Dashboard;
