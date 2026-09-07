import aboutSource from "./content/about.md?raw";
import { ContentPage } from "./page-content";

export function AboutPage() {
  return (
    <ContentPage
      documentTitle="关于 | 水杉输入法"
      description="关于水杉输入法"
      kicker="Metasequoia IME"
      source={aboutSource}
      contentId="about-content"
      contentClass="about-content"
      sectioned
    />
  );
}
