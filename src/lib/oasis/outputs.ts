import { asList, oasisApi } from "./api-client";
import type { OasisId, OutputFile } from "./types";

export async function listOutputFiles(id: OasisId) {
  try {
    const files = asList<OutputFile>(await oasisApi.get(`analyses/${id}/output_file_list`));
    if (files.length) return files;
  } catch {
    // Some Oasis API v2 deployments expose output_file_list but do not
    // implement its SQL-backed view. Fall back to the tar manifest below.
  }
  const filenames = await oasisApi.get<string[]>(`analyses/${id}/output_file_tar_list`);
  return (Array.isArray(filenames) ? filenames : []).map((filename, index) => ({
    id: index,
    filename,
    name: filename.replace(/^output\//, ""),
  }));
}

export function downloadOutputEntry(id: OasisId, filename: string) {
  return oasisApi.download(`analyses/${id}/output_file_tar_extract`, { filename });
}

export function downloadOutputFile(id: OasisId, fileId?: OasisId) {
  // output_file_sql requires a POST body containing user-provided SQL. Until
  // the result viewer supplies a SQL editor, download the complete API bundle.
  void fileId;
  return oasisApi.download(`analyses/${id}/output_file`);
}

export function downloadOutputTar(id: OasisId) {
  return oasisApi.download(`analyses/${id}/output_file`);
}
