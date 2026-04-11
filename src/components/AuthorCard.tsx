import { type Author } from "@/data/authors";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface Props {
  author: Author;
  variant?: "mini" | "full";
}

const BADGE_COLORS: Record<string, string> = {
  ORCID: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  Scopus: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  Lattes: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "FAPESP ID": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  "FAPESP PIPE": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  "Google Scholar": "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200",
  "Portal UNESP": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  Dimensions: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  Wikidata: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  FDA: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
};

export function AuthorCard({ author, variant = "mini" }: Props) {
  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-4">
          {author.photoUrl && (
            <img
              src={author.photoUrl}
              alt={author.photoAlt}
              className="w-16 h-16 rounded-full object-cover border-2 border-primary/20"
              loading="lazy"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {author.academicTitle && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {author.academicTitle}
                </Badge>
              )}
              <Badge variant="default" className="text-[10px] px-1.5 py-0">
                Autor verificado
              </Badge>
            </div>
            <h3 className="text-lg font-semibold text-foreground leading-tight">
              {author.name}
            </h3>
            {author.role && (
              <p className="text-sm text-muted-foreground mt-0.5">{author.role}</p>
            )}
            {author.department && (
              <p className="text-xs text-muted-foreground">{author.department}</p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {/* Mini bio — first line */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          {author.miniBio.split("\n")[0]}
        </p>

        {/* Academic identifier badges */}
        {author.identifiers?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {author.identifiers.map((id) => (
              <a
                key={id.url}
                href={id.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-opacity hover:opacity-80 ${BADGE_COLORS[id.name] || "bg-muted text-muted-foreground"}`}
              >
                {id.name}: {id.value}
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            ))}
          </div>
        )}

        {/* Full bio — only in "full" variant */}
        {variant === "full" && (
          <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed border-t border-border pt-3 mt-3">
            {author.fullBio}
          </p>
        )}

        {/* Social links */}
        <div className="flex flex-wrap gap-2 pt-1">
          {author.website && (
            <a href={author.website} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
              🌐 Website
            </a>
          )}
          {author.instagram && (
            <a href={author.instagram} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
              📷 Instagram
            </a>
          )}
          {author.linkedin && (
            <a href={author.linkedin} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
              💼 LinkedIn
            </a>
          )}
          {author.orcid && (
            <a href={`https://orcid.org/${author.orcid}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
              🔬 ORCID
            </a>
          )}
          {author.googleScholar && (
            <a href={author.googleScholar} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
              📚 Google Scholar
            </a>
          )}
          {author.fapesp && (
            <a href={author.fapesp} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
              🔬 FAPESP
            </a>
          )}
          {author.lattes && (
            <a href={author.lattes} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
              📋 Lattes
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
