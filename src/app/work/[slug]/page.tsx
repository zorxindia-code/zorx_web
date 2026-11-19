import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import ProjectPage from "@/components/work/ProjectPage";
import { OPEN_GRAPH, SITE_ORIGIN } from "@/config/seo";
import { projectStructuredData, serializeJsonLd } from "@/lib/seo/structuredData";
import { PROJECT_PAGES, findLiveProject, projectPath, projectSeoTitle } from "@/lib/work/projects";

/**
 * /work/{slug} — one template for every project (src/config/work.ts → `page`).
 * All project pages are prerendered; a page that is not live in this build
 * (unpublished, on the live site) and any unknown slug render the 404
 * (`dynamicParams` is not available with cacheComponents). Unpublished pages
 * in local / preview builds are noindex and stay out of the sitemap.
 */
export function generateStaticParams() {
  return PROJECT_PAGES.map((p) => ({ slug: p.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const project = findLiveProject((await params).slug);
  if (!project) return {};
  const { page } = project;
  const path = projectPath(project);
  const title = projectSeoTitle(project);
  const description = page.seo?.description ?? page.description ?? undefined;
  const firstImage = page.gallery.find((m) => m.type === "image");
  const image = page.seo?.image ?? firstImage?.src;
  const indexed = project.published && !!SITE_ORIGIN;
  return {
    title,
    ...(description ? { description } : {}),
    robots: project.published ? undefined : { index: false, follow: true },
    ...(indexed
      ? {
          alternates: { canonical: path },
          openGraph: {
            ...OPEN_GRAPH,
            type: "article",
            title,
            url: path,
            ...(description ? { description } : {}),
            ...(image ? { images: [{ url: image, alt: firstImage?.alt ?? project.title }] } : {}),
          },
          twitter: {
            card: "summary_large_image",
            title,
            ...(description ? { description } : {}),
            ...(image ? { images: [image] } : {}),
          },
        }
      : {}),
  };
}

/**
 * The route's shared shell must not wait on URL data (instant navigation), so
 * `params` is read inside <Suspense>. Direct visits are unaffected (every slug
 * is prerendered in full); links to project pages use `prefetch`, which loads
 * that page's content ahead of the click, so the black fallback is only seen
 * on a navigation that was not prefetched.
 */
export default function Page({ params }: Props) {
  return (
    <Suspense fallback={<div className="zorx-project-fallback" aria-hidden="true" />}>
      <Project params={params} />
    </Suspense>
  );
}

async function Project({ params }: Props) {
  const project = findLiveProject((await params).slug);
  if (!project) notFound();
  const jsonLd = projectStructuredData(project);
  return (
    <>
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />}
      <ProjectPage project={project} />
    </>
  );
}
