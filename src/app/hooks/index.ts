import { useState } from "react";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "../store";

export function useForceUpdate() {
  const [value, setValue] = useState(0);
  return () => setValue((value) => value + 1);
}

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
export { useWindowDimensions } from "./useWindowDimention";
export { useVehicleType, useVehicleTypeAddons } from "./useVehicleType";
export { useVahanData } from "./useVahanData";
export { useDeviceType } from "./useDeviceType";
export type { IUseDeviceType } from "./useDeviceType";
export { useTimer } from "./useTimer";
