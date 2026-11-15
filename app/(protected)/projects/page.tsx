import { X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db, fetchAll } from "@/lib/db";
import { ImportProjectsModal } from "./import-projects-modal";
import { MassDisqualifyModal } from "./mass-disqualify-modal";

interface ProjectWithCategories {
  id: string;
  name: string;
  status: string;
  url: string | null;
  location: string;
  location2: string;
  disqualifyReason: string | null;
  categoryId: string | null;
}

export default async function ProjectsPage() {
  const projectRows = await fetchAll(() =>
    db
      .from("projects")
      .select(
        "id,name,status,url,location,location2,disqualifyReason:disqualify_reason,submissions(categoryId:category_id)",
      )
      .order("name")
      .order("id"),
  );

  const allProjects: Array<Omit<ProjectWithCategories, "categoryId"> & { categories: string[] }> =
    projectRows.map(({ submissions, ...project }) => ({
      ...project,
      categories: submissions.map((s) => s.categoryId),
    }));

  return (
    <main className="mx-auto w-full max-w-6xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <p className="text-sm text-muted-foreground">
          Manage hackathon projects and their status
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>All Projects ({allProjects.length})</CardTitle>
          <div className="flex gap-2">
            <MassDisqualifyModal />
            <ImportProjectsModal projectsCount={allProjects.length} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Categories</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Disqualify Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allProjects.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground"
                    >
                      No projects found
                    </TableCell>
                  </TableRow>
                ) : (
                  allProjects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">
                          <span className={project.disqualifyReason ? "line-through" : ""}>{project.name}</span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            project.status === "created"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {project.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{project.location}</div>
                          <div className="text-muted-foreground">
                            {project.location2}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {project.categories.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {project.categories.map((catId) => (
                              <span
                                key={catId}
                                className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-800"
                              >
                                {catId}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            No categories
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {project.url ? (
                          <a
                            href={project.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline"
                          >
                            View Project
                          </a>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            No URL
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {project.disqualifyReason ? (
                          <span className="text-sm text-red-600">
                            {project.disqualifyReason}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            -
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
