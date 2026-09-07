import codeSource from "./content/code.md?raw";
import { ContentPage } from "./page-content";

export function CodePage() {
  return (
    <ContentPage
      documentTitle="开源代码 | 水杉输入法"
      description="水杉输入法的开源仓库一览"
      kicker="GPL-3.0"
      source={codeSource}
      contentId="code-content"
      contentClass="code-content"
      sectioned
      repoRows
    />
  );
}
