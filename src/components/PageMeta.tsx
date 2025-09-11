import { useEffect } from "react";

interface PageMetaProps {
  title: string;
  description?: string;
}

export const PageMeta = ({ title, description }: PageMetaProps) => {
  useEffect(() => {
    document.title = title;
    
    if (description) {
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', description);
      }
    }
  }, [title, description]);

  return null;
};