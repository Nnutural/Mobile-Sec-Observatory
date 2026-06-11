import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DataTable, type DataTableColumn } from "@/components/charts/DataTable";

interface Row {
  name: string;
  count: number;
}

const columns: Array<DataTableColumn<Row>> = [
  { key: "name", header: "名称", sortable: true },
  { key: "count", header: "数量", sortable: true, sortValue: (row) => row.count },
];

describe("DataTable", () => {
  it("toggles sorting across asc, desc, and none", () => {
    render(<DataTable columns={columns} rows={[{ name: "乙", count: 2 }, { name: "甲", count: 1 }]} />);
    const sortButton = screen.getByRole("button", { name: "名称" });
    fireEvent.click(sortButton);
    expect(within(screen.getAllByRole("row")[1]).getByText("甲")).toBeInTheDocument();
    fireEvent.click(sortButton);
    expect(within(screen.getAllByRole("row")[1]).getByText("乙")).toBeInTheDocument();
    fireEvent.click(sortButton);
    expect(within(screen.getAllByRole("row")[1]).getByText("乙")).toBeInTheDocument();
  });

  it("changes pages", () => {
    render(<DataTable columns={columns} rows={[{ name: "甲", count: 1 }, { name: "乙", count: 2 }]} pageSize={1} />);
    expect(screen.getByText("甲")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "下一页" }));
    expect(screen.getByText("乙")).toBeInTheDocument();
  });

  it("filters by search text", () => {
    render(
      <DataTable
        columns={columns}
        rows={[{ name: "甲", count: 1 }, { name: "乙", count: 2 }]}
        searchKeys={["name"]}
        searchPlaceholder="搜索名称"
      />,
    );
    fireEvent.change(screen.getByPlaceholderText("搜索名称"), { target: { value: "乙" } });
    expect(screen.getByText("乙")).toBeInTheDocument();
    expect(screen.queryByText("甲")).not.toBeInTheDocument();
  });
});
