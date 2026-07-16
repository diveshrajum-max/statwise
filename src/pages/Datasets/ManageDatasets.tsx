import {
  CalendarDays,
  Database,
  FileSpreadsheet,
  Filter,
  FolderOpen,
  Package,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import Sidebar from "../../components/layout/Sidebar";
import Header from "../../components/layout/Header";

import { supabase } from "../../lib/supabase";

import "./ManageDatasets.css";

/* Dataset type used by this page */

type Dataset = {
  id: number;

  name: string;

  fileName: string;

  filePath: string;

  plant: string;

  product: string;

  rows: number;

  columns: number;

  uploadedDate: string;
};

/* Supabase datasets-table row */

type SupabaseDataset = {
  id: number;

  dataset_name: string | null;

  file_name: string | null;

  file_path: string | null;

  plant: string | null;

  product: string | null;

  row_count: number | null;

  column_count: number | null;

  created_at: string | null;
};

function ManageDatasets() {
  const navigate = useNavigate();

  /* Real datasets loaded from Supabase */

  const [datasets, setDatasets] =
    useState<Dataset[]>([]);

  /* Loading state */

  const [isLoading, setIsLoading] =
    useState(true);

  /* Database error */

  const [loadError, setLoadError] =
    useState("");

  const [deletingId, setDeletingId] =
    useState<number | null>(null);

  /* Search */

  const [searchText, setSearchText] =
    useState("");

  /* Plant filter */

  const [plantFilter, setPlantFilter] =
    useState("all");

  /* Product filter */

  const [productFilter, setProductFilter] =
    useState("all");

  /*
  Load all uploaded datasets from Supabase
  */

  const loadDatasets =
    async () => {
      try {
        setIsLoading(true);

        setLoadError("");

        const {
          data,
          error,
        } = await supabase
          .from("datasets")
          .select(
            `
              id,
              dataset_name,
              file_name,
              file_path,
              plant,
              product,
              row_count,
              column_count,
              created_at
            `,
          )
          .order(
            "created_at",
            {
              ascending: false,
            },
          );

        if (error) {
          throw error;
        }

        /*
        Convert Supabase column names
        into the names already used
        by the existing design.
        */

        const formattedDatasets:
          Dataset[] = (
            (data ??
              []) as SupabaseDataset[]
          ).map(
            (dataset) => ({
              id:
                dataset.id,

              name:
                dataset.dataset_name ||
                "Untitled Dataset",

              fileName:
                dataset.file_name ||
                "Unknown file",

              filePath:
                dataset.file_path ||
                "",

              plant:
                dataset.plant ||
                "Not assigned",

              product:
                dataset.product ||
                "Not assigned",

              rows:
                dataset.row_count ??
                0,

              columns:
                dataset.column_count ??
                0,

              uploadedDate:
                dataset.created_at
                  ? new Date(
                      dataset.created_at,
                    ).toLocaleDateString(
                      "en-IN",
                      {
                        day:
                          "2-digit",

                        month:
                          "short",

                        year:
                          "numeric",
                      },
                    )
                  : "Unknown",
            }),
          );

        setDatasets(
          formattedDatasets,
        );
      } catch (error) {
        console.error(
          "Dataset loading error:",
          error,
        );

        if (
          error instanceof Error
        ) {
          setLoadError(
            error.message,
          );
        } else {
          setLoadError(
            "Datasets could not be loaded.",
          );
        }
      } finally {
        setIsLoading(
          false,
        );
      }
    };

  /*
  Load datasets when this page opens
  */
   /*
Delete the database record
and its uploaded file.
*/

const deleteDataset =
  async (
    dataset: Dataset,
  ) => {
    const confirmed =
      window.confirm(
        `Delete "${dataset.name}"?\n\nThis will permanently delete the dataset and its uploaded file.`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(
        dataset.id,
      );

      setLoadError("");

      /*
      Delete the actual Excel/CSV
      file from Supabase Storage.
      */

      if (dataset.filePath) {
        const {
          error:
            storageDeleteError,
        } =
          await supabase.storage
            .from(
              "dataset-files",
            )
            .remove([
              dataset.filePath,
            ]);

        if (
          storageDeleteError
        ) {
          throw storageDeleteError;
        }
      }

      /*
      Delete the dataset information
      from the database table.
      */

      const {
        error:
          databaseDeleteError,
      } = await supabase
        .from("datasets")
        .delete()
        .eq(
          "id",
          dataset.id,
        );

      if (
        databaseDeleteError
      ) {
        throw databaseDeleteError;
      }

      /*
      Remove it immediately
      from the screen.
      */

      setDatasets(
        (
          currentDatasets,
        ) =>
          currentDatasets.filter(
            (
              currentDataset,
            ) =>
              currentDataset.id !==
              dataset.id,
          ),
      );
    } catch (error) {
      console.error(
        "Dataset deletion error:",
        error,
      );

      window.alert(
        error instanceof Error
          ? `Dataset could not be deleted: ${error.message}`
          : "Dataset could not be deleted. Please try again.",
      );
    } finally {
      setDeletingId(
        null,
      );
    }
  };

  useEffect(() => {
    void loadDatasets();
  }, []);

  /*
  Create product-filter options
  automatically from uploaded data.
  */

  const availableProducts =
    useMemo(() => {
      return Array.from(
        new Set(
          datasets
            .map(
              (dataset) =>
                dataset.product,
            )
            .filter(
              (product) =>
                product &&
                product !==
                  "Not assigned",
            ),
        ),
      ).sort();
    }, [datasets]);

  /* Filter datasets */

  const filteredDatasets =
    useMemo(() => {
      return datasets.filter(
        (dataset) => {
          const searchValue =
            searchText
              .trim()
              .toLowerCase();

          const matchesSearch =
            dataset.name
              .toLowerCase()
              .includes(
                searchValue,
              ) ||
            dataset.fileName
              .toLowerCase()
              .includes(
                searchValue,
              ) ||
            dataset.plant
              .toLowerCase()
              .includes(
                searchValue,
              ) ||
            dataset.product
              .toLowerCase()
              .includes(
                searchValue,
              );

          const matchesPlant =
            plantFilter ===
              "all" ||
            dataset.plant ===
              plantFilter;

          const matchesProduct =
            productFilter ===
              "all" ||
            dataset.product ===
              productFilter;

          return (
            matchesSearch &&
            matchesPlant &&
            matchesProduct
          );
        },
      );
    }, [
      datasets,
      searchText,
      plantFilter,
      productFilter,
    ]);

  return (
    <div className="manage-datasets-page">
      {/* Sidebar */}

      <Sidebar />

      {/* Header */}

      <Header />

      {/* Main content */}

      <main className="manage-datasets-content">
        {/* Heading */}

        <section className="manage-datasets-heading">
          <div>
            <h1>
              Manage Datasets
            </h1>

            <p>
              View, organize, and manage all
              uploaded manufacturing datasets.
            </p>
          </div>

          <button
            type="button"
            className="manage-upload-button"
            onClick={() =>
              navigate(
                "/upload",
              )
            }
          >
            <Upload
              size={19}
            />

            Upload Dataset
          </button>
        </section>

        {/* Summary cards */}

        <section className="dataset-summary-grid">
          {/* Total datasets */}

          <article className="dataset-summary-card">
            <div>
              <span>
                Total Datasets
              </span>

              <strong>
                {
                  datasets.length
                }
              </strong>
            </div>

            <div className="dataset-summary-icon total-dataset-icon">
              <Database
                size={27}
              />
            </div>
          </article>

          {/* Chennai */}

          <article className="dataset-summary-card">
            <div>
              <span>
                Chennai Plant
              </span>

              <strong>
                {
                  datasets.filter(
                    (
                      dataset,
                    ) =>
                      dataset.plant ===
                      "Chennai Plant",
                  ).length
                }
              </strong>
            </div>

            <div className="dataset-summary-icon chennai-dataset-icon">
              <FolderOpen
                size={27}
              />
            </div>
          </article>

          {/* Trichy */}

          <article className="dataset-summary-card">
            <div>
              <span>
                Trichy Plant
              </span>

              <strong>
                {
                  datasets.filter(
                    (
                      dataset,
                    ) =>
                      dataset.plant ===
                      "Trichy Plant",
                  ).length
                }
              </strong>
            </div>

            <div className="dataset-summary-icon trichy-dataset-icon">
              <FileSpreadsheet
                size={27}
              />
            </div>
          </article>

          {/* Pondicherry */}

          <article className="dataset-summary-card">
            <div>
              <span>
                Pondicherry Plant
              </span>

              <strong>
                {
                  datasets.filter(
                    (
                      dataset,
                    ) =>
                      dataset.plant ===
                      "Pondicherry Plant",
                  ).length
                }
              </strong>
            </div>

            <div className="dataset-summary-icon pondicherry-dataset-icon">
              <Package
                size={27}
              />
            </div>
          </article>
        </section>

        {/* Search and filters */}

        <section className="dataset-filter-card">
          <div className="dataset-search-box">
            <Search
              size={19}
            />

            <input
              type="text"
              value={
                searchText
              }
              onChange={(
                event,
              ) =>
                setSearchText(
                  event
                    .target
                    .value,
                )
              }
              placeholder="Search datasets, files, plants, or products"
            />
          </div>

          <div className="dataset-filter-select">
            <Filter
              size={18}
            />

            <select
              value={
                plantFilter
              }
              onChange={(
                event,
              ) =>
                setPlantFilter(
                  event
                    .target
                    .value,
                )
              }
            >
              <option value="all">
                All Plants
              </option>

              <option value="Chennai Plant">
                Chennai Plant
              </option>

              <option value="Trichy Plant">
                Trichy Plant
              </option>

              <option value="Pondicherry Plant">
                Pondicherry Plant
              </option>
            </select>
          </div>

          <div className="dataset-filter-select">
            <Package
              size={18}
            />

            <select
              value={
                productFilter
              }
              onChange={(
                event,
              ) =>
                setProductFilter(
                  event
                    .target
                    .value,
                )
              }
            >
              <option value="all">
                All Products
              </option>

              {availableProducts.map(
                (
                  product,
                ) => (
                  <option
                    key={
                      product
                    }
                    value={
                      product
                    }
                  >
                    {
                      product
                    }
                  </option>
                ),
              )}
            </select>
          </div>
        </section>

        {/* Dataset list */}

        <section className="dataset-list-card">
          <div className="dataset-list-heading">
            <div>
              <h2>
                Dataset Library
              </h2>

              <p>
                {
                  isLoading
                    ? "Loading datasets..."
                    : `${filteredDatasets.length} ${
                        filteredDatasets.length ===
                        1
                          ? "dataset"
                          : "datasets"
                      } found`
                }
              </p>
            </div>

            <button
              type="button"
              className="dataset-refresh-button"
              onClick={() =>
                void loadDatasets()
              }
              disabled={
                isLoading
              }
              title="Refresh datasets"
            >
              {isLoading ? (
                <RefreshCw
                  size={22}
                />
              ) : (
                <CalendarDays
                  size={23}
                />
              )}
            </button>
          </div>

          {/* Loading */}

          {isLoading ? (
            <div className="empty-dataset-library">
              <div className="empty-dataset-icon">
                <RefreshCw
                  size={42}
                />
              </div>

              <h3>
                Loading datasets
              </h3>

              <p>
                Retrieving your uploaded
                datasets from Supabase.
              </p>
            </div>
          ) : loadError ? (
            /* Supabase error */

            <div className="empty-dataset-library">
              <div className="empty-dataset-icon">
                <Database
                  size={42}
                />
              </div>

              <h3>
                Unable to load
                datasets
              </h3>

              <p>
                {loadError}
              </p>

              <button
                type="button"
                onClick={() =>
                  void loadDatasets()
                }
              >
                <RefreshCw
                  size={19}
                />

                Try Again
              </button>
            </div>
          ) : filteredDatasets
              .length > 0 ? (
            /* Dataset table */

            <div className="dataset-table-wrapper">
              <table className="dataset-table">
                <thead>
                  <tr>
                    <th>
                      Dataset
                    </th>

                    <th>
                      Plant
                    </th>

                    <th>
                      Product
                    </th>

                    <th>
                      Size
                    </th>

                    <th>
                      Uploaded
                    </th>

                    <th>
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredDatasets.map(
                    (
                      dataset,
                    ) => (
                      <tr
                        key={
                          dataset.id
                        }
                      >
                        <td>
                          <div className="dataset-name-cell">
                            <div className="dataset-file-icon">
                              <FileSpreadsheet
                                size={
                                  21
                                }
                              />
                            </div>

                            <div>
                              <strong>
                                {
                                  dataset.name
                                }
                              </strong>

                              <span>
                                {
                                  dataset.fileName
                                }
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          {
                            dataset.plant
                          }
                        </td>

                        <td>
                          <span className="dataset-product-badge">
                            {
                              dataset.product
                            }
                          </span>
                        </td>

                        <td>
                          {
                            dataset.rows
                          }{" "}
                          rows

                          <br />

                          <span>
                            {
                              dataset.columns
                            }{" "}
                            columns
                          </span>
                        </td>

                        <td>
                          {
                            dataset.uploadedDate
                          }
                        </td>

                        <td>
                          <div className="dataset-action-buttons">
                            <button
                                type="button"
                                className="view-dataset-button"
                            >
                                View
                            </button>

                            <button
                                type="button"
                                className="delete-dataset-button"
                                disabled={
                                    deletingId ===
                                    dataset.id
                                }
                                onClick={() =>
                                    void deleteDataset(
                                        dataset,
                                    )
                                }
                            >
                            <Trash2
                                size={16}
                            />

    {deletingId ===
    dataset.id
      ? "Deleting..."
      : "Delete"}
  </button>
</div>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* Empty state */

            <div className="empty-dataset-library">
              <div className="empty-dataset-icon">
                <Database
                  size={42}
                />
              </div>

              <h3>
                No datasets found
              </h3>

              <p>
                {datasets.length >
                0
                  ? "No uploaded datasets match the selected search or filters."
                  : "Upload your first Excel or CSV dataset to begin statistical quality analysis."}
              </p>

              {datasets.length ===
                0 && (
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      "/upload",
                    )
                  }
                >
                  <Upload
                    size={
                      19
                    }
                  />

                  Upload Dataset
                </button>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default ManageDatasets;