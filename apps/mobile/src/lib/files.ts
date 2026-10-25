import * as DocumentPicker from 'expo-document-picker';

export async function pickFiles(types: string[], multiple = false): Promise<DocumentPicker.DocumentPickerAsset[]> {
  const r = await DocumentPicker.getDocumentAsync({ type: types, multiple, copyToCacheDirectory: true });
  return r.canceled ? [] : r.assets;
}
export function appendAsset(form: FormData, field: string, a: DocumentPicker.DocumentPickerAsset) {
  if (a.file) form.append(field, a.file, a.name);
  else form.append(field, { uri: a.uri, name: a.name, type: a.mimeType ?? 'application/octet-stream' } as unknown as Blob);
}
export const DOC_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/*', 'application/json'];
