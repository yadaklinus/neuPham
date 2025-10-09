"use client";

import { getWareHouseId } from "@/hooks/get-werehouseId";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import axios from "axios";
import { useState } from "react";
import * as XLSX from "xlsx";

export default function Upload() {
  const [data, setData] = useState([]);

  const warehousesId = getWareHouseId()

  async function handleSubmit() {
    alert("ok");
    const mapped = data.map((item: any) => ({
        name: item["Item Name"] || "",
        barcode: item["Item Number"] || "",
        cost: parseFloat(item["Cost"]) || 0,
        retailPrice: parseFloat(item["Price"]) || 0,
        wholeSalePrice: parseFloat(item["Price"]) || 0, // or use another column
        quantity: parseInt(item["In Stock"]) || 0,
        taxRate: 0, // default
        unit: "piece", // replace with actual value or column
        description: item["Department"] || "",
        sync: false,
        isDeleted: false,
        warehousesId: warehousesId // Replace with actual warehouse ID or logic
      }));
    console.log(mapped)
    const res = await axios.post("/api/product/upload-bel",{products:mapped})
    console.log(res)
  }

  const handleFileUpload = (e: any) => {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = (evt: any) => {
      const bstr = evt.target.result;
      const workbook = XLSX.read(bstr, { type: "binary" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];

      // Step 1: Read all rows
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Step 2: Use row 5 (index 4) as header
      const headers: any = rows[4];
      const dataRows = rows.slice(5); // Data after headers

      // Step 3: Convert to objects
      const cleanedData: any = dataRows.map((row: any) => {
        const obj: any = {};
        headers.forEach((header: any, i: any) => {
          if (header) {
            const cell = row[i];
            obj[header.trim()] =
              typeof cell === "string"
                ? cell.replace(/^\*+/, "").trim()
                : cell;
          }
        });
        return obj;
      });

      // Optional: filter out empty rows
      const filteredData = cleanedData.filter((row: any) =>
        Object.values(row).some((value) => value !== null && value !== "")
      );

      setData(filteredData);
    };

    reader.readAsBinaryString(file); // 👈 THIS LINE IS REQUIRED
  };

  return (
    <>
      <Input type="file" onChange={handleFileUpload} />
      <Button onClick={handleSubmit}>Submit</Button>
    </>
  );
}
