import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login/Login";
import Dashboard from "./pages/Dashboard/Dashboard";
import UploadDataset from "./pages/Upload/UploadDataset";
import ManageDatasets from "./pages/Datasets/ManageDatasets";
import DescriptiveStatistics from "./pages/Statistics/DescriptiveStatistics";
import GraphicalSummary from "./pages/Statistics/GraphicalSummary";
import ProcessCapability from "./pages/Quality/ProcessCapability";
import CapabilitySixPack from "./pages/Quality/SixPackCapability";
import RegressionAnalysis from "./pages/Regression/RegressionAnalysis";


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route path="/login" element={<Login />} />

        <Route path="/dashboard" element={<Dashboard />} />

        <Route path="/upload" element={<UploadDataset />} />
        
        <Route path="/datasets" element={<ManageDatasets />} />

        <Route path="/Statistics" element={<DescriptiveStatistics />}/>

        <Route path="/graphical-summary" element={<GraphicalSummary />}/>

        <Route path="/capability" element={<ProcessCapability />} />

        <Route path="/capability-six-pack" element={<CapabilitySixPack />} />

        <Route path="/regression-analysis" element={<RegressionAnalysis />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;

