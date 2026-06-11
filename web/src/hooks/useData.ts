import useSWR, { type SWRResponse } from "swr";
import type {
  AppVersionsData,
  AppsData,
  CLRIData,
  ComparisonData,
  ComponentAPIMap,
  DashboardStats,
  PDIData,
  PermissionAPIMap,
  PermissionsMetadata,
  VulnerabilitiesData,
} from "@/types";

const fetcher = <T>(url: string) => fetch(url).then((r) => r.json() as Promise<T>);

export function useApps(): SWRResponse<AppsData> {
  return useSWR<AppsData>("/data/apps.json", fetcher);
}

export function useAppVersions(): SWRResponse<AppVersionsData> {
  return useSWR<AppVersionsData>("/data/app_versions.json", fetcher);
}

export function usePermissionsMetadata(): SWRResponse<PermissionsMetadata> {
  return useSWR<PermissionsMetadata>("/data/permissions_metadata.json", fetcher);
}

export function usePDI(): SWRResponse<PDIData> {
  return useSWR<PDIData>("/data/pdi_results.json", fetcher);
}

export function useVulnerabilities(): SWRResponse<VulnerabilitiesData> {
  return useSWR<VulnerabilitiesData>("/data/vulnerabilities.json", fetcher);
}

export function useCLRI(): SWRResponse<CLRIData> {
  return useSWR<CLRIData>("/data/clri_matrix.json", fetcher);
}

export function useComparison(): SWRResponse<ComparisonData> {
  return useSWR<ComparisonData>("/data/comparison.json", fetcher);
}

export function useDashboardStats(): SWRResponse<DashboardStats> {
  return useSWR<DashboardStats>("/data/dashboard_stats.json", fetcher);
}

export function usePermissionAPIMap(): SWRResponse<PermissionAPIMap> {
  return useSWR<PermissionAPIMap>("/data/permission_api_map.json", fetcher);
}

export function useComponentAPIMap(): SWRResponse<ComponentAPIMap> {
  return useSWR<ComponentAPIMap>("/data/component_api_map.json", fetcher);
}
