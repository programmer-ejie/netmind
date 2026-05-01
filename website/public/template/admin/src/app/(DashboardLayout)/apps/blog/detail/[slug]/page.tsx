
import BreadcrumbComp from '@/app/(DashboardLayout)/layout/shared/breadcrumb/BreadcrumbComp';
import BlogDetailData from '@/app/components/apps/blog/detail';
import React from 'react'
import { BlogProvider } from '@/app/context/BlogContext/index';
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Blog Details",
};

const BCrumb = [
  {
    to: "/",
    title: "Home",
  },
  {
    title: "Blog Detail",
  },
];

interface PageProps {
  params: {
    slug: string;
  };
}

const BlogDetail = ({ params }: PageProps) => {
  return (
    <>
      <BlogProvider>
        <BreadcrumbComp title="Blog Detail" items={BCrumb} />
        <BlogDetailData slug={params.slug} />
      </BlogProvider>
    </>
  )
}

export default BlogDetail

// Generate static params for static export
export async function generateStaticParams() {
  // Since we have static data, generate params for each post
  const posts = [
    { id: 1, title: "Garmins Instinct Crossover is a rugged hybrid smartwatch" },
    { id: 2, title: "After Twitter Staff Cuts, Survivors Face Radio Silence" },
    { id: 3, title: "Apple is apparently working on a new streamlined accessibility for iOS" },
    { id: 4, title: "Why Figma is selling to Adobe for $20 billion streamlined" },
    { id: 5, title: "Streaming video way before it was cool, go dark tomorrow" },
    { id: 6, title: "As yen tumbles, gadget-loving Japan goes for secondhand iPhones" },
    { id: 7, title: "Intel loses bid to revive antitrust case against patent foe Fortress" },
    { id: 8, title: "COVID outbreak deepens as more lockdowns loom in China" },
    { id: 9, title: "Early Black Friday Amazon deals: cheap TVs, headphones, laptops" },
    { id: 10, title: "Presented by Max Rushden with Barry Glendenning, Philippe Auclair" },
  ];

  return posts.map((post) => ({
    slug: post.id.toString(),
  }));
}
