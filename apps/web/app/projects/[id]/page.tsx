import { EditorLayout } from "@/components/editor/EditorLayout";

interface Props {
  params: { id: string };
}

export default function ProjectEditorPage({ params }: Props) {
  return <EditorLayout projectId={params.id} />;
}
