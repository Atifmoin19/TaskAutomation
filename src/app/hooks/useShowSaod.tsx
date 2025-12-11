import { differenceInDays, subDays, subYears } from "date-fns";
import { useAppSelector } from ".";
import { getDateFromDDMMYYYY } from "Services/general";

const useShowSaod = () => {
  const { registrationDate } = useAppSelector(
    (state) => state.motorInsurance.vehicleDetails.vehicleDetails
  );
  const { subCategory } = useAppSelector(
    (state) => state.motorInsurance.vehicleDetails.vehicleDetails
  );
  const { catagory } = useAppSelector(
    (state) => state.motorInsurance.vehicleDetails.vehicleDetails
  );

  let showSaod = true;
  // const DiffVariable = catagory === 4 ? 2 : 4

  if (registrationDate) {
    showSaod = !(
      differenceInDays(
        getDateFromDDMMYYYY(registrationDate),
        catagory === 4 ? subYears(new Date(), 2) : subYears(new Date(), 4)
      ) < 0
    );
  }

  if (catagory !== 4 && catagory !== 2) {
    showSaod = false;
  }
  if (
    subCategory === "Goods Carrying Vehicle" ||
    subCategory === "Passenger Carrying Vehicle"
  ) {
    showSaod = false;
  }

  return { showSaod };
};

export { useShowSaod };
