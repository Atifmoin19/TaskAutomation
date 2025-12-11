import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from ".";
import { ISaveLead } from "Models/RequestModels/Leads";
import { useSaveLeadsMutation } from "Services/API/leads.api";
import { updateDropOff, updateLeadID } from "features/Leads";
import { store } from "app/store";
import { useUpdateLeadMutation } from "Services/API/Life/lms.api";

export const useSaveLead = (stage: string) => {
  const cbsData = useAppSelector((state) => state.cbsData);
  const leadDetails = useAppSelector((state) => state.leadDetails);
  const memberDetails = useAppSelector((state) => state.memberDetails);
  const cart = useAppSelector((state) => state.cart);

  const [updateLead] = useUpdateLeadMutation();
  const dispatch = useAppDispatch();

  const getUpdateLeadPayload = () => {
    return {
      first_name: store.getState().cbsData.customerDetails?.first_name ?? "",
      last_name: store.getState().cbsData.customerDetails?.last_name ?? "",
      phone_number:
        store.getState().cbsData.customerDetails?.contact_numbers ?? "",
      email: store.getState().cbsData.customerDetails?.emails ?? "",
      product: "HEALTH",
      lead_stage: stage,
      lead_uid: store.getState().planData.lead_id ?? "",
      lead_journey_data: {
        insurer_name: "India First",
        lead_data: {
          route: window.location.pathname,
          cbsData: store.getState().cbsData,
          planData: store.getState().planData,
          assuredAndPayorDetails: store.getState().assuredAndPayorDetails,
          cart,
          memberDetails,
        },
      },
    };
  };

  const updateLeadData = async () => {
    const payload = getUpdateLeadPayload;
    try {
      const response = await updateLead(getUpdateLeadPayload()).unwrap();
      // dispatch(updateLeadID({ lead_uid: response.lead_uid }))
      // dispatch(updateDropOff({ drop_off: response.drop_off }))
      return response;
    } catch (e) {
      console.log(e);
    }
  };

  useEffect(() => {
    // TODO: Calling API when data is changed (NOT WORKING AS EXPECTED)
    updateLeadData();
  }, [cbsData, leadDetails, memberDetails, cart]);

  return {
    updateLeadData,
  };
};
