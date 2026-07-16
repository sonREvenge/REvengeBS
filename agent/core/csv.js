import { offsets } from "./offsets.js";
import { getFunctions } from "./functions.js";
import { getLibc } from "../utils/utils.js";

let _getColumnIndexByName = null;
let _getValueAt = null;
let _getBooleanValueAt = null;
let _getIntegerValueAt = null;
let _getCSV = null;

const ROW_TABLE_ARRAY_PTR = 72;
const ROW_TABLE_ROW_STRIDE = 8;
const ROW_TABLE_ROW_COUNT = 84;

const _csvCache = new Map();

export function initCSV(base) {
    _getColumnIndexByName = new NativeFunction(
        base.add(offsets.CSVTable__getColumnIndexByName), "int", ["pointer", "pointer"]
    );
    _getValueAt = new NativeFunction(
        base.add(offsets.CSVRow__getValueAt), "pointer", ["pointer", "int"]
    );
    _getBooleanValueAt = new NativeFunction(
        base.add(offsets.CSVRow__getBooleanValueAt), "bool", ["pointer", "int"]
    );
    _getIntegerValueAt = new NativeFunction(
        base.add(offsets.CSVRow__getIntegerValueAt), "int", ["pointer", "int"]
    );
    _getCSV = new NativeFunction(
        base.add(offsets.ResourceManager__getCSV), "pointer", ["pointer"]
    );
}

function _makeScString(str) {
    const fns = getFunctions();
    const lc = getLibc();
    if (!fns || !lc) return null;
    const raw = Memory.allocUtf8String(str);
    const obj = lc.malloc(128);
    fns.StringCtor(obj, raw);
    return obj;
}

function _readScString(p) {
    try {
        if (!p || p.isNull()) return null;
        const len = p.add(offsets.ScString_length).readU32();
        if (len === 0 || len > 1024) return null;
        const sp = len < 8 ? p.add(offsets.ScString_data) : p.add(offsets.ScString_data).readPointer();
        if (!sp || sp.isNull()) return null;
        return sp.readUtf8String(len);
    } catch (_) { return null; }
}

export function loadCSV(filename) {
    if (!_getCSV) return null;
    const cached = _csvCache.get(filename);
    if (cached) return cached;
    try {
        const sc = _makeScString(filename);
        if (!sc) return null;
        const nodePtr = _getCSV(sc);
        if (!nodePtr || nodePtr.isNull()) return null;
        const node = new CSVNode(nodePtr);
        const table = node.getTable();
        if (!table) return null;
        _csvCache.set(filename, table);
        return table;
    } catch (_) { return null; }
}

export class CSVTable {
    constructor(ptr) {
        this.ptr = ptr;
    }

    getRowAt(index) {
        try {
            const rowsArray = this.ptr.add(ROW_TABLE_ARRAY_PTR).readPointer();
            const rowPtr = rowsArray.add(ROW_TABLE_ROW_STRIDE * index).readPointer();
            if (!rowPtr || rowPtr.isNull()) return null;
            return new CSVRow(rowPtr);
        } catch (_) { return null; }
    }

    getColumnIndexByName(name) {
        const buf = Memory.allocUtf8String(name);
        return _getColumnIndexByName(this.ptr, buf);
    }

    getRowCount() {
        try { return this.ptr.add(ROW_TABLE_ROW_COUNT).readS32(); }
        catch (_) { return 0; }
    }
}

export class CSVRow {
    constructor(ptr) {
        this.ptr = ptr;
    }

    get table() {
        return new CSVTable(this.ptr.readPointer());
    }

    getValueAt(column) {
        return _readScString(_getValueAt(this.ptr, column));
    }

    getBooleanValueAt(column) {
        return Boolean(_getBooleanValueAt(this.ptr, column));
    }

    getIntegerValueAt(column) {
        return _getIntegerValueAt(this.ptr, column);
    }

    getName() {
        return this.getValueAt(0);
    }

    getValue(name, index = 0) {
        const col = this.table.getColumnIndexByName(name);
        if (col < 0) return null;
        return this.getValueAt(col + index);
    }

    getBooleanValue(name, index = 0) {
        const col = this.table.getColumnIndexByName(name);
        if (col < 0) return false;
        return this.getBooleanValueAt(col + index);
    }

    getIntegerValue(name, index = 0) {
        const col = this.table.getColumnIndexByName(name);
        if (col < 0) return 0;
        return this.getIntegerValueAt(col + index);
    }
}

export class CSVNode {
    constructor(ptr) {
        this.ptr = ptr;
    }

    getTable() {
        const tablePtr = this.ptr.readPointer();
        if (!tablePtr || tablePtr.isNull()) return null;
        return new CSVTable(tablePtr);
    }
}
