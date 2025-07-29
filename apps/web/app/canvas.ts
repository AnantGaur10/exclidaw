import { UserShape } from "./room/canvas/[roomID]/page";

export enum ShapeType {
    Line = 'line',
    Rectangle = 'rectangle',
    Pencil = 'pencil',
    Ellipse = 'ellipse',
    Eraser = 'eraser',
}

export interface Shape {
    id: string;
    type: ShapeType;
    x: number;
    y: number;
    width?: number;
    height?: number;
    endX?: number;
    endY?: number;
    color: string;
    points?: number[][];
    strokeWidth: number;
    isComplete: boolean;
}

export interface PencilChunk {
    id: string;
    type: 'pencil_chunk';
    chunkIndex: number;
    totalChunks: number;
    points: number[][];
    isComplete: boolean;
    x: number;
    y: number;
    color: string;
    strokeWidth: number;
}

export class CanvasHandler {
    private boundHandleMouseDown: (e: MouseEvent) => void;
    private boundHandleMouseMove: (e: MouseEvent) => void;
    private boundHandleMouseUp: () => void;
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private shapes: Shape[] = []; // Shapes drawn by the current user in this session
    private remoteShapes: Shape[] = []; // Shapes drawn by other users
    private currentShape: Shape | null = null;
    private animationId: number | null = null;
    private isDrawing: boolean = false;
    private startX: number = 0;
    private startY: number = 0;
    private undoStack: Shape[] = [];
    private currentTool: ShapeType = ShapeType.Rectangle;
    private onShapeAddCallback: ((shape: Shape) => void) | null = null;
    private onPencilChunkCallback: ((chunk: PencilChunk) => void) | null = null;
    private onShapeEraseCallback: ((shapeId: string) => void) | null = null;
    private highlightedShapeId: string | null = null;

    private readonly CHUNK_SIZE = 50;
    private readonly MIN_DISTANCE = 2;
    private readonly SIMPLIFICATION_TOLERANCE = 1.5;

    private pencilChunkBuffer: Map<string, {
        chunks: number[][][];
        receivedChunks: number;
        totalChunks: number;
        shape: Partial<Shape>;
    }> = new Map();

    constructor(
        canvas: HTMLCanvasElement,
        onShapeAdd: (shape: Shape) => void,
        onPencilChunk?: (chunk: PencilChunk) => void,
        onShapeErase?: (shapeId: string) => void,
    ) {
        this.canvas = canvas;
        this.onShapeAddCallback = onShapeAdd;
        this.onPencilChunkCallback = onPencilChunk || null;
        this.onShapeEraseCallback = onShapeErase || null;
        this.canvas.tabIndex = 0;
        this.canvas.focus();
        const context = canvas.getContext("2d");

        if (!context) {
            throw new Error("Could not get 2D context from canvas");
        }

        this.ctx = context;
        this.boundHandleMouseDown = this.handleMouseDown.bind(this);
        this.boundHandleMouseMove = this.handleMouseMove.bind(this);
        this.boundHandleMouseUp = this.handleMouseUp.bind(this);

        this.setupCanvas();
        this.startAnimationLoop();
        this.setupEventListeners();
    }

    private setupCanvas(): void {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.canvas.style.cursor = 'default';
    }

    private setupEventListeners(): void {
        this.canvas.addEventListener('mousedown', this.boundHandleMouseDown);
        this.canvas.addEventListener('mousemove', this.boundHandleMouseMove);
        this.canvas.addEventListener('mouseup', this.boundHandleMouseUp);
        this.canvas.addEventListener('mouseleave', this.boundHandleMouseUp);
    }
    
    // This is the key change: This function now ONLY checks against `this.shapes` (local user's shapes)
    private getShapeAtPoint(x: number, y: number): Shape | null {
        for (let i = this.shapes.length - 1; i >= 0; i--) {
            const shape = this.shapes[i]!;
            const originalLineWidth = this.ctx.lineWidth;
            this.ctx.lineWidth = Math.max(originalLineWidth, shape.strokeWidth, 10);
            
            this.ctx.beginPath();
            
            switch (shape.type) {
                case ShapeType.Rectangle:
                    if (shape.width !== undefined && shape.height !== undefined) {
                        this.ctx.rect(shape.x, shape.y, shape.width, shape.height);
                    }
                    break;
                case ShapeType.Ellipse:
                    if (shape.width !== undefined && shape.height !== undefined) {
                        const radiusX = Math.abs(shape.width / 2);
                        const radiusY = Math.abs(shape.height / 2);
                        const centerX = shape.x + shape.width / 2;
                        const centerY = shape.y + shape.height / 2;
                        this.ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
                    }
                    break;
                case ShapeType.Line:
                    if (shape.endX !== undefined && shape.endY !== undefined) {
                        this.ctx.moveTo(shape.x, shape.y);
                        this.ctx.lineTo(shape.endX, shape.endY);
                        if (this.ctx.isPointInStroke(x, y)) {
                            this.ctx.lineWidth = originalLineWidth;
                            return shape;
                        }
                    }
                    break;
                case ShapeType.Pencil:
                    if (shape.points && shape.points.length > 0) {
                        this.ctx.moveTo(shape.x, shape.y);
                        shape.points.forEach(point => this.ctx.lineTo(point[0]!, point[1]!));
                        if (this.ctx.isPointInStroke(x, y)) {
                             this.ctx.lineWidth = originalLineWidth;
                            return shape;
                        }
                    }
                    break;
            }

            this.ctx.lineWidth = originalLineWidth;
            if (shape.type === ShapeType.Rectangle || shape.type === ShapeType.Ellipse) {
                 if (this.ctx.isPointInPath(x, y)) return shape;
            }
        }
        return null;
    }

    private handleMouseDown(e: MouseEvent): void {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (this.currentTool === ShapeType.Eraser) {
            const shapeToErase = this.getShapeAtPoint(x, y);
            if (shapeToErase) {
                this.removeShapeById(shapeToErase.id);
                if (this.onShapeEraseCallback) {
                    this.onShapeEraseCallback(shapeToErase.id);
                }
            }
            return;
        }

        this.canvas.style.cursor = 'crosshair';
        this.isDrawing = true;
        this.startX = x;
        this.startY = y;

        this.currentShape = {
            id: crypto.randomUUID(),
            type: this.currentTool,
            x: this.startX,
            y: this.startY,
            points: this.currentTool === ShapeType.Pencil ? [[this.startX, this.startY]] : [],
            color: '#000000',
            strokeWidth: 2,
            isComplete: false
        };
    }

    private handleMouseMove(e: MouseEvent): void {
        const rect = this.canvas.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;

        if (this.currentTool === ShapeType.Eraser) {
            const shape = this.getShapeAtPoint(currentX, currentY);
            this.highlightedShapeId = shape ? shape.id : null;
            this.canvas.style.cursor = shape ? 'pointer' : 'crosshair';
            return;
        }

        if (!this.isDrawing || !this.currentShape) return;
        
        switch (this.currentTool) {
            case ShapeType.Rectangle:
                this.currentShape.width = currentX - this.startX;
                this.currentShape.height = currentY - this.startY;
                break;
            case ShapeType.Ellipse:
                let width = currentX - this.startX;
                let height = currentY - this.startY;
                if (e.shiftKey) {
                    const side = Math.max(Math.abs(width), Math.abs(height));
                    width = side * Math.sign(width);
                    height = side * Math.sign(height);
                }
                this.currentShape.width = width;
                this.currentShape.height = height;
                break;
            case ShapeType.Line:
                this.currentShape.endX = currentX;
                this.currentShape.endY = currentY;
                break;
            case ShapeType.Pencil:
                const lastPoint = this.currentShape.points![this.currentShape.points!.length - 1];
                if (lastPoint && lastPoint.length === 2) {
                    const distance = Math.sqrt(Math.pow(currentX - lastPoint[0]!, 2) + Math.pow(currentY - lastPoint[1]!, 2));
                    if (distance > this.MIN_DISTANCE) { this.currentShape.points!.push([currentX, currentY]); }
                } else { this.currentShape.points!.push([currentX, currentY]); }
                break;
        }
    }

    private handleMouseUp(): void {
        if (this.currentTool === ShapeType.Eraser) return;

        if (!this.currentShape) { this.isDrawing = false; return; }

        this.currentShape.isComplete = true;
        this.shapes.push(this.currentShape);

        if (this.currentShape.type === ShapeType.Pencil) {
            this.sendPencilInChunks(this.currentShape);
        } else {
            if (this.onShapeAddCallback) { this.onShapeAddCallback({ ...this.currentShape }); }
        }
        
        this.currentShape = null;
        this.isDrawing = false;
        this.undoStack = [];
        this.canvas.style.cursor = 'default';
    }

    private startAnimationLoop(): void {
        const animate = () => {
            this.render();
            this.animationId = requestAnimationFrame(animate);
        };
        animate();
    }

    private render(): void {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = "#ffffff";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        const allShapes = [...this.shapes, ...this.remoteShapes];

        allShapes.forEach(shape => {
            const isHighlighted = shape.id === this.highlightedShapeId;
            this.drawShape(shape, isHighlighted);
});

        if (this.currentShape && this.isDrawing) {
            this.drawShape(this.currentShape, false);
        }
    }

    private drawShape(shape: Shape, isHighlighted: boolean): void {
        this.ctx.strokeStyle = shape.color;
        this.ctx.lineWidth = shape.strokeWidth;
        this.ctx.fillStyle = 'transparent';
        
        if (isHighlighted) {
            this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
            this.ctx.lineWidth = shape.strokeWidth + 2;
            this.ctx.setLineDash([8, 4]);
        }

        this.ctx.beginPath();
        switch (shape.type) {
            case ShapeType.Rectangle:
                if (shape.width !== undefined && shape.height !== undefined) {
                    this.ctx.rect(shape.x, shape.y, shape.width, shape.height);
                }
                break;
            case ShapeType.Ellipse:
                if (shape.width !== undefined && shape.height !== undefined) {
                    const radiusX = Math.abs(shape.width / 2);
                    const radiusY = Math.abs(shape.height / 2);
                    const centerX = shape.x + shape.width / 2;
                    const centerY = shape.y + shape.height / 2;
                    this.ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
                }
                break;
            case ShapeType.Line:
                if (shape.endX !== undefined && shape.endY !== undefined) {
                    this.ctx.moveTo(shape.x, shape.y);
                    this.ctx.lineTo(shape.endX, shape.endY);
                }
                break;
            case ShapeType.Pencil:
                if (shape.points && shape.points.length > 0) {
                    this.ctx.lineJoin = 'round';
                    this.ctx.lineCap = 'round';
                    this.ctx.moveTo(shape.x, shape.y);
                    shape.points.forEach(point => { this.ctx.lineTo(point[0] as number, point[1] as number); });
                }
                break;
        }
        this.ctx.stroke();

        if (isHighlighted) {
            this.ctx.setLineDash([]);
        }
    }
    
    public loadShapes(initialShapes: UserShape[], currentUserID: string): void {
        this.shapes = [];
        this.remoteShapes = [];
        const localShapes: Shape[] = [];
        const remoteShapes: Shape[] = [];

        initialShapes.forEach(shapeData => {
            const shape: Shape = {
                id: shapeData.id,
                type: shapeData.type as ShapeType,
                x: shapeData.x,
                y: shapeData.y,
                width: shapeData.width,
                height: shapeData.height,
                endX: shapeData.endX,
                endY: shapeData.endY,
                color: shapeData.color,
                points: shapeData.points,
                strokeWidth: shapeData.strokeWidth,
                isComplete: true,
            };

            if (shapeData.creatorId === currentUserID) {
                localShapes.push(shape);
            } else {
                remoteShapes.push(shape);
            }
        });

        this.shapes = localShapes;
        this.remoteShapes = remoteShapes;
        this.undoStack = [];
        console.log(`Loaded ${localShapes.length} local shapes and ${remoteShapes.length} remote shapes from server.`);
    }

    public setTool(tool: ShapeType): void {
        this.currentTool = tool;
        if (tool !== ShapeType.Eraser) {
            this.highlightedShapeId = null;
        }
    }
    
    public undo(): Shape | undefined {
        if (this.shapes.length === 0) { return undefined; }
        const removedShape = this.shapes.pop();
        if (removedShape) { this.undoStack.push(removedShape); }
        return removedShape;
    }

    public removeShapeById(shapeId: string): void {
        const initialLocalLength = this.shapes.length;
        const initialRemoteLength = this.remoteShapes.length;
        this.shapes = this.shapes.filter(shape => shape.id !== shapeId);
        this.remoteShapes = this.remoteShapes.filter(shape => shape.id !== shapeId);
        if (this.remoteShapes.length < initialRemoteLength) {
            console.log(`Removed remote shape ${shapeId} via server command.`);
        } else if (this.shapes.length < initialLocalLength) {
             console.log(`Removed local shape ${shapeId}.`);
        }
    }

    // --- Unchanged Methods (simplifiedPath, adaptiveSample, etc.) ---
    private simplifyPath(points: number[][], tolerance: number): number[][] {
        if (points.length <= 2) return points;
        const getPerpendicularDistance = (point: number[], lineStart: number[], lineEnd: number[]): number => {
            const [x, y] = point; const [x1, y1] = lineStart; const [x2, y2] = lineEnd;
            const A = x! - x1!; const B = y! - y1!; const C = x2! - x1!; const D = y2! - y1!;
            const dot = A * C + B * D; const lenSq = C * C + D * D;
            if (lenSq === 0) return Math.sqrt(A * A + B * B);
            const param = dot / lenSq;
            let xx: number, yy: number;
            if (param < 0) { xx = x1!; yy = y1!; } 
            else if (param > 1) { xx = x2!; yy = y2!; } 
            else { xx = x1! + param * C; yy = y1! + param * D; }
            const dx = x! - xx; const dy = y! - yy;
            return Math.sqrt(dx * dx + dy * dy);
        };
        const douglasPeucker = (points: number[][], tolerance: number): number[][] => {
            if (points.length <= 2) return points;
            let maxDistance = 0; let maxIndex = 0; const end = points.length - 1;
            for (let i = 1; i < end; i++) {
                const distance = getPerpendicularDistance(points[i]!, points[0]!, points[end]!);
                if (distance > maxDistance) { maxDistance = distance; maxIndex = i; }
            }
            if (maxDistance > tolerance) {
                const left = douglasPeucker(points.slice(0, maxIndex + 1), tolerance);
                const right = douglasPeucker(points.slice(maxIndex), tolerance);
                return [...left.slice(0, -1), ...right];
            }
            return [points[0]!, points[end]!];
        };
        return douglasPeucker(points, tolerance);
    }

    private adaptiveSample(points: number[][], minDistance: number): number[][] {
        if (points.length <= 1) return points;
        const sampled = [points[0]]; let lastPoint = points[0]!;
        for (let i = 1; i < points.length; i++) {
            const curr = points[i]!;
            const distance = Math.sqrt( Math.pow(curr[0]! - lastPoint[0]!, 2) + Math.pow(curr[1]! - lastPoint[1]!, 2) );
            if (distance >= minDistance || i === points.length - 1) { sampled.push(curr); lastPoint = curr; }
        }
        //@ts-ignore
        return sampled;
    }

    private optimizePencilPoints(points: number[][]): number[][] {
        if (points.length <= 2) return points;
        let optimized = this.adaptiveSample(points, this.MIN_DISTANCE);
        optimized = this.simplifyPath(optimized, this.SIMPLIFICATION_TOLERANCE);
        return optimized;
    }

    private sendPencilInChunks(shape: Shape): void {
        if (!shape.points || shape.points.length === 0 || !this.onPencilChunkCallback) return;
        const optimizedPoints = this.optimizePencilPoints(shape.points);
        shape.points = optimizedPoints;
        const chunks: number[][][] = [];
        for (let i = 0; i < optimizedPoints.length; i += this.CHUNK_SIZE) {
            chunks.push(optimizedPoints.slice(i, i + this.CHUNK_SIZE));
        }
        chunks.forEach((chunk, index) => {
            const isLastChunk = index === chunks.length - 1;
            const pencilChunk: PencilChunk = {
                id: shape.id, type: 'pencil_chunk', chunkIndex: index, totalChunks: chunks.length,
                points: chunk, isComplete: isLastChunk, x: shape.x, y: shape.y,
                color: shape.color, strokeWidth: shape.strokeWidth
            };
            this.onPencilChunkCallback!(pencilChunk);
        });
        if (this.onShapeAddCallback) { this.onShapeAddCallback(shape); }
    }

    public handlePencilChunk(chunk: PencilChunk): void {
        const { id, chunkIndex, totalChunks, points, x, y, color, strokeWidth } = chunk;
        if (!this.pencilChunkBuffer.has(id)) {
            this.pencilChunkBuffer.set(id, {
                chunks: new Array(totalChunks), receivedChunks: 0, totalChunks,
                shape: { id, type: ShapeType.Pencil, x, y, color, strokeWidth, isComplete: false }
            });
        }
        const buffer = this.pencilChunkBuffer.get(id)!;
        buffer.chunks[chunkIndex] = points;
        buffer.receivedChunks++;
        if (buffer.receivedChunks === totalChunks) {
            const completePoints = buffer.chunks.flat();
            const completeShape: Shape = { ...buffer.shape, points: completePoints, isComplete: true } as Shape;
            this.addRemoteShape(completeShape);
            this.pencilChunkBuffer.delete(id);
        }
    }
    
    public addRemoteShape(shape: Shape): void { this.remoteShapes.push(shape); }
    public resize(): void { this.canvas.width = window.innerWidth; this.canvas.height = window.innerHeight; }
    public clear(): void { this.shapes = []; this.remoteShapes = []; this.currentShape = null; }
    public redo(): void { const shape = this.undoStack.pop(); if (shape) { this.shapes.push(shape); } }
    public getShapes(): Shape[] { return [...this.shapes, ...this.remoteShapes]; }
    public destroy(): void {
        if (this.animationId) { cancelAnimationFrame(this.animationId); }
        this.canvas.removeEventListener('mousedown', this.boundHandleMouseDown);
        this.canvas.removeEventListener('mousemove', this.boundHandleMouseMove);
        this.canvas.removeEventListener('mouseup', this.boundHandleMouseUp);
        this.canvas.removeEventListener('mouseleave', this.boundHandleMouseUp);
        this.pencilChunkBuffer.clear();
    }
}