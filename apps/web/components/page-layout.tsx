import { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface PageLayoutProps {
  children: ReactNode;
}

export function PageLayout({ children }: PageLayoutProps) {
  return <div className="w-full space-y-6">{children}</div>;
}

interface ContentSectionProps {
  title?: string;
  description?: string;
  children: ReactNode;
}

export function ContentSection({
  title,
  description,
  children,
}: ContentSectionProps) {
  if (title) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}
