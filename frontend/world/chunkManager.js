// world/chunkManager.js
import * as BABYLON from "@babylonjs/core";
import { markWalkableGround } from "../grounding.js";

const buildingsConfig = [
    {
        name: "CL_Plaza",
        filename: "I_CL_Plaza_v1.0.0.glb",
        center: new BABYLON.Vector3(0, 3.8, 0),
        size: new BABYLON.Vector3(119.5, 5, 112.4),
        renderMargin: 0,
        horizontalLoad: 15,
        horizontalDispose: 30,
        verticalLoad: 5,
        verticalDispose: 15,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "CL_Plaza_Stair",
        filename: "I_CL_Plaza_Stair_v1.0.0.glb",
        center: new BABYLON.Vector3(15.63, 3.8, -20.39),
        size: new BABYLON.Vector3(60, 5, 30),
        renderMargin: 5,
        horizontalLoad: 15,
        horizontalDispose: 30,
        verticalLoad: 5,
        verticalDispose: 15,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "CL_Plaza_Root",
        filename: "I_CL_Plaza_Root_v1.0.0.glb",
        center: new BABYLON.Vector3(0, 4.5, 0),
        size: new BABYLON.Vector3(119.5, 5, 112.4),
        renderMargin: 5,
        horizontalLoad: 15,
        horizontalDispose: 30,
        verticalLoad: 5,
        verticalDispose: 30,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "CL_Building MainHall",
        filename: "I_CL_MainHall_v1.0.0.glb",
        center: new BABYLON.Vector3(0, 10.9439, 0),
        size: new BABYLON.Vector3(92.4, 7.8, 105.2),
        renderMargin: 5,
        horizontalLoad: 15,
        horizontalDispose: 30,
        verticalLoad: 5,
        verticalDispose: 30,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "CL_Building Library Stair",
        filename: "I_CL_Library_Stair_v1.0.0.glb",
        center: new BABYLON.Vector3(0, 15, 0),
        size: new BABYLON.Vector3(50, 20, 50),
        renderMargin: 5,
        horizontalLoad: 15,
        horizontalDispose: 30,
        verticalLoad: 5,
        verticalDispose: 30,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "CL_Building Library L2",
        filename: "I_CL_Library_L2_v1.0.0.glb",
        center: new BABYLON.Vector3(0, 15, 0),
        size: new BABYLON.Vector3(70, 7.8, 70),
        renderMargin: 5,
        horizontalLoad: 15,
        horizontalDispose: 30,
        verticalLoad: 10,
        verticalDispose: 30,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "CL_Building Library L2 Left",
        filename: "I_CL_Library_L2_Left_v1.0.0.glb",
        center: new BABYLON.Vector3(0, 20, 21.23),
        size: new BABYLON.Vector3(70, 7.8, 45),
        renderMargin: 5,
        horizontalLoad: 15,
        horizontalDispose: 50,
        verticalLoad: 10,
        verticalDispose: 30,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "CL_Building Library L2 Right",
        filename: "I_CL_Library_L2_Right_v1.0.0.glb",
        center: new BABYLON.Vector3(0, 20, -21.23),
        size: new BABYLON.Vector3(70, 7.8, 45),
        renderMargin: 5,
        horizontalLoad: 15,
        horizontalDispose: 50,
        verticalLoad: 10,
        verticalDispose: 30,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "CL_Building Library L3",
        filename: "I_CL_Library_L3_v1.0.0.glb",
        center: new BABYLON.Vector3(0, 23, 0),
        size: new BABYLON.Vector3(70, 7.8, 70),
        renderMargin: 5,
        horizontalLoad: 15,
        horizontalDispose: 30,
        verticalLoad: 10,
        verticalDispose: 30,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "CL_Building Library L3",
        filename: "I_CL_Library_L3_Park_v1.0.0.glb",
        center: new BABYLON.Vector3(0, 23, 0),
        size: new BABYLON.Vector3(70, 7.8, 70),
        renderMargin: 5,
        horizontalLoad: 15,
        horizontalDispose: 30,
        verticalLoad: 10,
        verticalDispose: 30,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "CL_Building Library L3 Right",
        filename: "I_CL_Library_L3_Right_v1.0.0.glb",
        center: new BABYLON.Vector3(0, 23, -21.23),
        size: new BABYLON.Vector3(70, 7.8, 45),
        renderMargin: 5,
        horizontalLoad: 15,
        horizontalDispose: 50,
        verticalLoad: 10,
        verticalDispose: 30,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "CL_Building Library L4",
        filename: "I_CL_Library_L4_v1.0.0.glb",
        center: new BABYLON.Vector3(0, 28, 0),
        size: new BABYLON.Vector3(70, 7.8, 70),
        renderMargin: 5,
        horizontalLoad: 15,
        horizontalDispose: 30,
        verticalLoad: 10,
        verticalDispose: 30,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "CL_Building Library L5",
        filename: "I_CL_Library_L5_v1.0.0.glb",
        center: new BABYLON.Vector3(0, 32, 0),
        size: new BABYLON.Vector3(70, 7.8, 70),
        renderMargin: 5,
        horizontalLoad: 15,
        horizontalDispose: 30,
        verticalLoad: 10,
        verticalDispose: 30,
        container: null,
        status: "UNLOADED"
    },
    // ==========================================
    // BUILDING: SM_B (SM Building)
    // ==========================================
    {
        name: "SM_B_F1",
        filename: "I_SM_L1_v1.0.0.glb",
        center: new BABYLON.Vector3(-83.4735, 4, 0),
        size: new BABYLON.Vector3(24.5, 7, 180),
        renderMargin: 0,
        horizontalLoad: 15,
        horizontalDispose: 30,
        verticalLoad: 5,
        verticalDispose: 20,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "SM_B_F2",
        filename: "I_SM_L2_v1.0.0.glb",
        center: new BABYLON.Vector3(-83.4735, 8, 0),
        size: new BABYLON.Vector3(24.5, 5, 190),
        renderMargin: 0,
        horizontalLoad: 15,
        horizontalDispose: 30,
        verticalLoad: 5,
        verticalDispose: 20,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "SM_B_F3",
        filename: "I_SM_L3_v1.0.0.glb",
        center: new BABYLON.Vector3(-83.4735, 12.2, 0),
        size: new BABYLON.Vector3(24.5, 6, 190),
        renderMargin: 0,
        horizontalLoad: 15,
        horizontalDispose: 30,
        verticalLoad: 5,
        verticalDispose: 20,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "SM_B_F4",
        filename: "I_SM_L4_v1.0.0.glb",
        center: new BABYLON.Vector3(-83.4735, 16.2, 0),
        size: new BABYLON.Vector3(24.5, 6, 190),
        renderMargin: 0,
        horizontalLoad: 15,
        horizontalDispose: 30,
        verticalLoad: 5,
        verticalDispose: 20,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "SM_B_J_SR",
        filename: "I_SM_Junction_SR_v1.0.0.glb",
        center: new BABYLON.Vector3(-83.4735, 10, -83.4735),
        size: new BABYLON.Vector3(90, 20, 90),
        renderMargin: 5,
        horizontalLoad: 20,
        horizontalDispose: 30,
        verticalLoad: 5,
        verticalDispose: 15,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "SM_B_J_SG",
        filename: "I_SM_Junction_SG_v1.0.0.glb",
        center: new BABYLON.Vector3(-83.4735, 10, 83.4735),
        size: new BABYLON.Vector3(90, 20, 90),
        renderMargin: 5,
        horizontalLoad: 20,
        horizontalDispose: 30,
        verticalLoad: 5,
        verticalDispose: 15,
        container: null,
        status: "UNLOADED"
    },
    // ==========================================
    // BUILDING: SG (SG Building)
    // ==========================================
    {
        name: "SG_B_F1",
        filename: "I_SG_L1_v1.0.0.glb",
        center: new BABYLON.Vector3(0, 4, 83.4735),
        size: new BABYLON.Vector3(190, 7, 24.5),
        renderMargin: 5,
        horizontalLoad: 15,
        horizontalDispose: 30,
        verticalLoad: 5,
        verticalDispose: 20,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "SG_B_F2",
        filename: "I_SG_L2_v1.0.0.glb",
        center: new BABYLON.Vector3(0, 8, 83.4735),
        size: new BABYLON.Vector3(190, 5, 24.5),
        renderMargin: 0,
        horizontalLoad: 15,
        horizontalDispose: 30,
        verticalLoad: 5,
        verticalDispose: 20,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "SG_B_F3",
        filename: "I_SG_L3_v1.0.0.glb",
        center: new BABYLON.Vector3(0, 12.2, 83.4735),
        size: new BABYLON.Vector3(190, 6, 24.5),
        renderMargin: 0,
        horizontalLoad: 15,
        horizontalDispose: 30,
        verticalLoad: 5,
        verticalDispose: 20,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "SG_B_F4",
        filename: "I_SG_L4_v1.0.0.glb",
        center: new BABYLON.Vector3(0, 16.2, 83.4735),
        size: new BABYLON.Vector3(190, 6, 24.5),
        renderMargin: 0,
        horizontalLoad: 15,
        horizontalDispose: 30,
        verticalLoad: 5,
        verticalDispose: 20,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "SG_B_EndPoint",
        filename: "I_SG_EndP_v1.0.0.glb",
        center: new BABYLON.Vector3(83.4735, 10, -83.4735),
        size: new BABYLON.Vector3(80, 35, 80),
        renderMargin: 0,
        horizontalLoad: 15,
        horizontalDispose: 30,
        verticalLoad: 5,
        verticalDispose: 20,
        container: null,
        status: "UNLOADED"
    },
    // ==========================================
    // BUILDING: SR (SR Building)
    // ==========================================
    {
        name: "SR_B_F1",
        filename: "I_SR_L1_v1.0.0.glb",
        center: new BABYLON.Vector3(0, 4, -83.4735),
        size: new BABYLON.Vector3(190, 7, 24.5),
        renderMargin: 5,
        horizontalLoad: 15,
        horizontalDispose: 30,
        verticalLoad: 5,
        verticalDispose: 20,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "SR_B_F2",
        filename: "I_SR_L2_v1.0.0.glb",
        center: new BABYLON.Vector3(0, 8, -83.4735),
        size: new BABYLON.Vector3(190, 5, 24.5),
        renderMargin: 0,
        horizontalLoad: 15,
        horizontalDispose: 30,
        verticalLoad: 5,
        verticalDispose: 20,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "SR_B_F3",
        filename: "I_SR_L3_v1.0.0.glb",
        center: new BABYLON.Vector3(0, 12.2, -83.4735),
        size: new BABYLON.Vector3(190, 6, 24.5),
        renderMargin: 0,
        horizontalLoad: 15,
        horizontalDispose: 30,
        verticalLoad: 5,
        verticalDispose: 20,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "SR_B_F4",
        filename: "I_SR_L4_v1.0.0.glb",
        center: new BABYLON.Vector3(0, 16.2, -83.4735),
        size: new BABYLON.Vector3(190, 6, 24.5),
        renderMargin: 0,
        horizontalLoad: 15,
        horizontalDispose: 30,
        verticalLoad: 5,
        verticalDispose: 20,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "SR_B_EndPoint",
        filename: "I_SR_EndP_v1.0.0.glb",
        center: new BABYLON.Vector3(83.4735, 10, 83.4735),
        size: new BABYLON.Vector3(80, 35, 80),
        renderMargin: 0,
        horizontalLoad: 15,
        horizontalDispose: 30,
        verticalLoad: 5,
        verticalDispose: 20,
        container: null,
        status: "UNLOADED"
    },
    // ==========================================
    // SGSR: Stair
    // ==========================================
    {
        name: "SG_SR_Stair",
        filename: "I_SG_SR_Stairs_v1.0.0.glb",
        center: new BABYLON.Vector3(0, 10, 0),
        size: new BABYLON.Vector3(190, 30, 190),
        renderMargin: 0,
        horizontalLoad: 15,
        horizontalDispose: 30,
        verticalLoad: 5,
        verticalDispose: 20,
        container: null,
        status: "UNLOADED"
    },
    // ==========================================
    // MSM: Middle
    // ==========================================
    {
        name: "MSM_Mid_L1",
        filename: "I_MSM_Mid_L1_v1.0.0.glb",
        center: new BABYLON.Vector3(-168.742, 1.25, 61.49),
        size: new BABYLON.Vector3(67, 30, 30),
        renderMargin: 0,
        horizontalLoad: 15,
        horizontalDispose: 30,
        verticalLoad: 5,
        verticalDispose: 20,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "MSM_L1",
        filename: "I_MSM_L1_v1.0.0.glb",
        center: new BABYLON.Vector3(-145.56, 1.25, 62.00),
        size: new BABYLON.Vector3(30, 30, 80),
        renderMargin: 0,
        horizontalLoad: 30,
        horizontalDispose: 35,
        verticalLoad: 5,
        verticalDispose: 20,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "MSE_L1",
        filename: "I_MSE_L1_v1.0.0.glb",
        center: new BABYLON.Vector3(-191.57, 1.25, 62.81),
        size: new BABYLON.Vector3(35, 30, 80),
        renderMargin: 0,
        horizontalLoad: 20,
        horizontalDispose: 30,
        verticalLoad: 5,
        verticalDispose: 20,
        container: null,
        status: "UNLOADED"
    },
    // ==========================================
    // VMES
    // ==========================================
    {
        name: "VMES_Stair_Back",
        filename: "I_VMES_Stair_Back_v1.0.0.glb",
        center: new BABYLON.Vector3(-235.48, 50, 93.98),
        size: new BABYLON.Vector3(35, 100, 30),
        renderMargin: 0,
        horizontalLoad: 15,
        horizontalDispose: 30,
        verticalLoad: 5,
        verticalDispose: 20,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "VMES_Stair_Front",
        filename: "I_VMES_Stair_Front_v1.0.0.glb",
        center: new BABYLON.Vector3(-235.48, 50, 29.801),
        size: new BABYLON.Vector3(35, 100, 30),
        renderMargin: 0,
        horizontalLoad: 15,
        horizontalDispose: 30,
        verticalLoad: 5,
        verticalDispose: 20,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "VMES_L1",
        filename: "I_VMES_L1_v1.0.0.glb",
        center: new BABYLON.Vector3(-231.744, 1.25, 61.7549),
        size: new BABYLON.Vector3(35, 15, 80),
        renderMargin: 0,
        horizontalLoad: 15,
        horizontalDispose: 30,
        verticalLoad: 5,
        verticalDispose: 20,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "VMES_L2",
        filename: "I_VMES_L2_v1.0.0.glb",
        center: new BABYLON.Vector3(-231.744, 8, 61.7549),
        size: new BABYLON.Vector3(35, 12, 80),
        renderMargin: 0,
        horizontalLoad: 0,
        horizontalDispose: 20,
        verticalLoad: 5,
        verticalDispose: 20,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "VMES_L3",
        filename: "I_VMES_L3_v1.0.0.glb",
        center: new BABYLON.Vector3(-231.744, 12, 61.7549),
        size: new BABYLON.Vector3(35, 12, 80),
        renderMargin: 0,
        horizontalLoad: 0,
        horizontalDispose: 20,
        verticalLoad: 5,
        verticalDispose: 20,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "VMES_L4",
        filename: "I_VMES_L4_v1.0.0.glb",
        center: new BABYLON.Vector3(-231.744, 16, 61.7549),
        size: new BABYLON.Vector3(35, 12, 80),
        renderMargin: 0,
        horizontalLoad: 0,
        horizontalDispose: 20,
        verticalLoad: 5,
        verticalDispose: 20,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "VMES_L5",
        filename: "I_VMES_L5_v1.0.0.glb",
        center: new BABYLON.Vector3(-231.744, 20, 61.7549),
        size: new BABYLON.Vector3(35, 12, 80),
        renderMargin: 0,
        horizontalLoad: 0,
        horizontalDispose: 20,
        verticalLoad: 5,
        verticalDispose: 20,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "VMES_L6",
        filename: "I_VMES_L6_v1.0.0.glb",
        center: new BABYLON.Vector3(-231.744, 24, 61.7549),
        size: new BABYLON.Vector3(35, 12, 80),
        renderMargin: 0,
        horizontalLoad: 0,
        horizontalDispose: 20,
        verticalLoad: 5,
        verticalDispose: 20,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "VMES_L7",
        filename: "I_VMES_L7_v1.0.0.glb",
        center: new BABYLON.Vector3(-231.744, 28, 61.7549),
        size: new BABYLON.Vector3(35, 12, 80),
        renderMargin: 0,
        horizontalLoad: 0,
        horizontalDispose: 20,
        verticalLoad: 5,
        verticalDispose: 20,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "VMES_L8",
        filename: "I_VMES_L8_v1.0.0.glb",
        center: new BABYLON.Vector3(-231.744, 32, 61.7549),
        size: new BABYLON.Vector3(35, 12, 80),
        renderMargin: 0,
        horizontalLoad: 0,
        horizontalDispose: 20,
        verticalLoad: 5,
        verticalDispose: 20,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "VMES_L9",
        filename: "I_VMES_L9_v1.0.0.glb",
        center: new BABYLON.Vector3(-231.744, 36, 61.7549),
        size: new BABYLON.Vector3(35, 12, 80),
        renderMargin: 0,
        horizontalLoad: 0,
        horizontalDispose: 20,
        verticalLoad: 5,
        verticalDispose: 20,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "VMES_L10",
        filename: "I_VMES_L10_v1.0.0.glb",
        center: new BABYLON.Vector3(-231.744, 40, 61.7549),
        size: new BABYLON.Vector3(35, 12, 80),
        renderMargin: 0,
        horizontalLoad: 0,
        horizontalDispose: 20,
        verticalLoad: 5,
        verticalDispose: 20,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "VMES_L11",
        filename: "I_VMES_L11_v1.0.0.glb",
        center: new BABYLON.Vector3(-231.744, 44, 61.7549),
        size: new BABYLON.Vector3(35, 12, 80),
        renderMargin: 0,
        horizontalLoad: 0,
        horizontalDispose: 20,
        verticalLoad: 5,
        verticalDispose: 20,
        container: null,
        status: "UNLOADED"
    },
    // VME
    {
        name: "VME_Stair_Back",
        filename: "I_VME_Stair_Back_v1.0.0.glb",
        center: new BABYLON.Vector3(-275.10, 50, 93.98),
        size: new BABYLON.Vector3(35, 100, 30),
        renderMargin: 0,
        horizontalLoad: 15,
        horizontalDispose: 30,
        verticalLoad: 5,
        verticalDispose: 20,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "VME_Stair_Front",
        filename: "I_VME_Stair_Front_v1.0.0.glb",
        center: new BABYLON.Vector3(-275.10, 50, 29.801),
        size: new BABYLON.Vector3(35, 100, 30),
        renderMargin: 0,
        horizontalLoad: 15,
        horizontalDispose: 30,
        verticalLoad: 5,
        verticalDispose: 20,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "VME_L1",
        filename: "I_VME_L1_v1.0.0.glb",
        center: new BABYLON.Vector3(-275.10, 1.25, 61.7549),
        size: new BABYLON.Vector3(35, 15, 80),
        renderMargin: 0,
        horizontalLoad: 15,
        horizontalDispose: 30,
        verticalLoad: 5,
        verticalDispose: 20,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "VME_L2",
        filename: "I_VME_L2_v1.0.0.glb",
        center: new BABYLON.Vector3(-275.10, 8, 61.7549),
        size: new BABYLON.Vector3(35, 12, 80),
        renderMargin: 0,
        horizontalLoad: 0,
        horizontalDispose: 20,
        verticalLoad: 5,
        verticalDispose: 20,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "VME_L3",
        filename: "I_VME_L3_v1.0.0.glb",
        center: new BABYLON.Vector3(-275.10, 12, 61.7549),
        size: new BABYLON.Vector3(35, 12, 80),
        renderMargin: 0,
        horizontalLoad: 0,
        horizontalDispose: 20,
        verticalLoad: 5,
        verticalDispose: 20,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "VME_L4",
        filename: "I_VME_L4_v1.0.0.glb",
        center: new BABYLON.Vector3(-275.10, 16, 61.7549),
        size: new BABYLON.Vector3(35, 12, 80),
        renderMargin: 0,
        horizontalLoad: 0,
        horizontalDispose: 20,
        verticalLoad: 5,
        verticalDispose: 20,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "VME_L5",
        filename: "I_VME_L5_v1.0.0.glb",
        center: new BABYLON.Vector3(-275.10, 20, 61.7549),
        size: new BABYLON.Vector3(35, 12, 80),
        renderMargin: 0,
        horizontalLoad: 0,
        horizontalDispose: 20,
        verticalLoad: 5,
        verticalDispose: 20,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "VME_L6",
        filename: "I_VME_L6_v1.0.0.glb",
        center: new BABYLON.Vector3(-275.10, 24, 61.7549),
        size: new BABYLON.Vector3(35, 12, 80),
        renderMargin: 0,
        horizontalLoad: 0,
        horizontalDispose: 20,
        verticalLoad: 5,
        verticalDispose: 20,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "VME_L7",
        filename: "I_VME_L7_v1.0.0.glb",
        center: new BABYLON.Vector3(-275.10, 28, 61.7549),
        size: new BABYLON.Vector3(35, 12, 80),
        renderMargin: 0,
        horizontalLoad: 0,
        horizontalDispose: 20,
        verticalLoad: 5,
        verticalDispose: 20,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "VME_L8",
        filename: "I_VME_L8_v1.0.0.glb",
        center: new BABYLON.Vector3(-275.10, 32, 61.7549),
        size: new BABYLON.Vector3(35, 12, 80),
        renderMargin: 0,
        horizontalLoad: 0,
        horizontalDispose: 20,
        verticalLoad: 5,
        verticalDispose: 20,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "VME_L9",
        filename: "I_VME_L9_v1.0.0.glb",
        center: new BABYLON.Vector3(-275.10, 36, 61.7549),
        size: new BABYLON.Vector3(35, 12, 80),
        renderMargin: 0,
        horizontalLoad: 0,
        horizontalDispose: 20,
        verticalLoad: 5,
        verticalDispose: 20,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "VME_L10",
        filename: "I_VME_L10_v1.0.0.glb",
        center: new BABYLON.Vector3(-275.10, 40, 61.7549),
        size: new BABYLON.Vector3(35, 12, 80),
        renderMargin: 0,
        horizontalLoad: 0,
        horizontalDispose: 20,
        verticalLoad: 5,
        verticalDispose: 20,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "VME_L11",
        filename: "I_VME_L11_v1.0.0.glb",
        center: new BABYLON.Vector3(-275.10, 44, 61.7549),
        size: new BABYLON.Vector3(35, 12, 80),
        renderMargin: 0,
        horizontalLoad: 0,
        horizontalDispose: 20,
        verticalLoad: 5,
        verticalDispose: 20,
        container: null,
        status: "UNLOADED"
    },
    // VME Middle
    {
        name: "VME_Middle_L1",
        filename: "I_VME_Mid_L1_v1.0.0.glb",
        center: new BABYLON.Vector3(-252.57, 1.25, 88.33),
        size: new BABYLON.Vector3(40, 15, 80),
        renderMargin: 0,
        horizontalLoad: 15,
        horizontalDispose: 30,
        verticalLoad: 5,
        verticalDispose: 20,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "VME_Middle_L2",
        filename: "I_VME_Mid_L2_v1.0.0.glb",
        center: new BABYLON.Vector3(-252.57, 8, 88.33),
        size: new BABYLON.Vector3(40, 12, 80),
        renderMargin: 0,
        horizontalLoad: 10,
        horizontalDispose: 30,
        verticalLoad: 5,
        verticalDispose: 20,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "VME_Middle_L3",
        filename: "I_VME_Mid_L3_v1.0.0.glb",
        center: new BABYLON.Vector3(-252.57, 12, 88.33),
        size: new BABYLON.Vector3(40, 12, 80),
        renderMargin: 0,
        horizontalLoad: 10,
        horizontalDispose: 30,
        verticalLoad: 5,
        verticalDispose: 20,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "VME_Middle_L4",
        filename: "I_VME_Mid_L4_v1.0.0.glb",
        center: new BABYLON.Vector3(-252.57, 16, 88.33),
        size: new BABYLON.Vector3(40, 12, 80),
        renderMargin: 0,
        horizontalLoad: 10,
        horizontalDispose: 30,
        verticalLoad: 5,
        verticalDispose: 20,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "VME_Middle_L5",
        filename: "I_VME_Mid_L5_v1.0.0.glb",
        center: new BABYLON.Vector3(-252.57, 20, 88.33),
        size: new BABYLON.Vector3(40, 12, 80),
        renderMargin: 0,
        horizontalLoad: 10,
        horizontalDispose: 30,
        verticalLoad: 5,
        verticalDispose: 20,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "VME_Middle_L6",
        filename: "I_VME_Mid_L6_v1.0.0.glb",
        center: new BABYLON.Vector3(-252.57, 24, 88.33),
        size: new BABYLON.Vector3(40, 12, 80),
        renderMargin: 0,
        horizontalLoad: 10,
        horizontalDispose: 30,
        verticalLoad: 5,
        verticalDispose: 20,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "VME_Middle_L7",
        filename: "I_VME_Mid_L7_v1.0.0.glb",
        center: new BABYLON.Vector3(-252.57, 28, 88.33),
        size: new BABYLON.Vector3(40, 12, 80),
        renderMargin: 0,
        horizontalLoad: 10,
        horizontalDispose: 30,
        verticalLoad: 5,
        verticalDispose: 20,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "VME_Middle_L8",
        filename: "I_VME_Mid_L8_v1.0.0.glb",
        center: new BABYLON.Vector3(-252.57, 32, 88.33),
        size: new BABYLON.Vector3(40, 12, 80),
        renderMargin: 0,
        horizontalLoad: 10,
        horizontalDispose: 30,
        verticalLoad: 5,
        verticalDispose: 20,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "VME_Middle_L9",
        filename: "I_VME_Mid_L9_v1.0.0.glb",
        center: new BABYLON.Vector3(-252.57, 36, 88.33),
        size: new BABYLON.Vector3(40, 12, 80),
        renderMargin: 0,
        horizontalLoad: 10,
        horizontalDispose: 30,
        verticalLoad: 5,
        verticalDispose: 20,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "VME_Middle_L10",
        filename: "I_VME_Mid_L10_v1.0.0.glb",
        center: new BABYLON.Vector3(-252.57, 40, 88.33),
        size: new BABYLON.Vector3(40, 12, 80),
        renderMargin: 0,
        horizontalLoad: 10,
        horizontalDispose: 30,
        verticalLoad: 5,
        verticalDispose: 20,
        container: null,
        status: "UNLOADED"
    },
    {
        name: "VME_Middle_L11",
        filename: "I_VME_Mid_L11_v1.0.0.glb",
        center: new BABYLON.Vector3(-252.57, 44, 88.33),
        size: new BABYLON.Vector3(40, 12, 80),
        renderMargin: 0,
        horizontalLoad: 10,
        horizontalDispose: 30,
        verticalLoad: 5,
        verticalDispose: 20,
        container: null,
        status: "UNLOADED"
    },
];

function isPointInBox(point, center, size, horizontalMargin = 0, verticalMargin = 0) {
    const halfX = (size.x / 2) + horizontalMargin;
    const halfZ = (size.z / 2) + horizontalMargin;
    const halfY = (size.y / 2) + verticalMargin; // Use the strict vertical margin here

    return (
        point.x >= center.x - halfX && point.x <= center.x + halfX &&
        point.z >= center.z - halfZ && point.z <= center.z + halfZ &&
        point.y >= center.y - halfY && point.y <= center.y + halfY
    );
}

export function initChunkManager(scene, player, BaseUrl) {

    // drawDebugZones(scene, buildingsConfig, "VME_Middle_L10");

    scene.onBeforeRenderObservable.add(() => {
        if (!player) return;
        buildingsConfig.forEach(chunk => {
            // Pass the horizontal and vertical margins separately
            const isInsideRenderBox = isPointInBox(player.position, chunk.center, chunk.size, chunk.renderMargin, chunk.renderMargin);

            const isInsideLoadBox = isPointInBox(player.position, chunk.center, chunk.size,
                chunk.horizontalLoad, chunk.verticalLoad);

            const isInsideDisposeBox = isPointInBox(player.position, chunk.center, chunk.size,
                chunk.horizontalDispose, chunk.verticalDispose);

            // 1. DISPOSE
            if (!isInsideDisposeBox && chunk.status !== "UNLOADED") {
                if (chunk.status === "IN_RAM" || chunk.status === "IN_SCENE") {
                    chunk.container.dispose();
                    chunk.container = null;
                }
                chunk.status = "UNLOADED";
                console.log(`Purged ${chunk.name} from RAM`);
                return;
            }

            // 2. LOAD
            if (isInsideLoadBox && chunk.status === "UNLOADED") {
                chunk.status = "LOADING";

                BABYLON.SceneLoader.LoadAssetContainerAsync(BaseUrl, chunk.filename, scene)
                    .then(container => {
                        if (chunk.status === "UNLOADED") {
                            container.dispose();
                        } else {
                            container.meshes.forEach((mesh) => {
                                if (mesh.isVisible && mesh.name !== "__root__") {
                                    mesh.checkCollisions = true;
                                    markWalkableGround(mesh);
                                }
                            });

                            chunk.container = container;
                            chunk.status = "IN_RAM";
                            console.log(`${chunk.name} is ready in RAM`);
                        }
                    }).catch(err => {
                        console.error(`Failed to load ${chunk.name}:`, err);
                        chunk.status = "UNLOADED";
                    });
            }

            // 3. RENDER
            if (isInsideRenderBox && chunk.status === "IN_RAM") {
                chunk.container.addAllToScene();
                chunk.status = "IN_SCENE";
                console.log(`Rendered ${chunk.name}`);
            }

            // 4. HIDE
            if (!isInsideRenderBox && isInsideDisposeBox && chunk.status === "IN_SCENE") {
                chunk.container.removeAllFromScene();
                chunk.status = "IN_RAM";
                console.log(`Hid ${chunk.name}`);
            }
        });
    });
}

// ==========================================
// DEBUG: DRAW VISIBLE & SEPARABLE ZONES WITH LABELS (COLOR-CODED)
// ==========================================
export function drawDebugZones(scene, configArray, targetName = null) {
    configArray.forEach((chunk) => {

        // FILTER: If a target name was provided, skip any chunk that doesn't include it
        if (targetName && !chunk.name.includes(targetName)) {
            return;
        }

        // Helper function to draw clean boxes with floating labels
        const createCleanBox = (name, marginH, marginV, edgeAlpha, edgeThickness, labelText, boxColor, colorHex) => {

            // Calculate exact physical dimensions of this specific box
            const width = chunk.size.x + (marginH * 2);
            const height = chunk.size.y + (marginV * 2);
            const depth = chunk.size.z + (marginH * 2);

            const box = BABYLON.MeshBuilder.CreateBox(name, {
                width: width,
                height: height,
                depth: depth
            }, scene);

            box.position = chunk.center;
            box.isPickable = false;
            box.checkCollisions = false;

            // Make the solid faces invisible
            const mat = new BABYLON.StandardMaterial(`${name}_mat`, scene);
            mat.alpha = 0;
            box.material = mat;

            // Draw ONLY the 12 outer edges using the provided color
            box.enableEdgesRendering();
            box.edgesWidth = edgeThickness;
            box.edgesColor = new BABYLON.Color4(boxColor.r, boxColor.g, boxColor.b, edgeAlpha);

            // ==========================================
            // CREATE THE FLOATING TEXT LABEL
            // ==========================================
            const labelPlane = BABYLON.MeshBuilder.CreatePlane(`${name}_label`, { width: 15, height: 3 }, scene);

            // Anchor it exactly to the Top-Left corner of this specific box
            labelPlane.position = new BABYLON.Vector3(
                chunk.center.x - (width / 2),
                chunk.center.y + (height / 2) + 1.5,
                chunk.center.z - (depth / 2)
            );

            labelPlane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
            labelPlane.isPickable = false;

            // Draw the text onto a dynamic canvas
            const dt = new BABYLON.DynamicTexture(`${name}_dt`, { width: 1024, height: 256 }, scene, false);
            dt.hasAlpha = true;

            // Add a black dropshadow so the text is readable against the bright sky
            dt.getContext().shadowColor = "black";
            dt.getContext().shadowBlur = 6;
            dt.getContext().shadowOffsetX = 3;
            dt.getContext().shadowOffsetY = 3;

            // Write the label in the matching color
            dt.drawText(labelText, null, 150, "bold 70px Arial", colorHex, "transparent", true);

            // Apply the text to the plane and make it glow
            const labelMat = new BABYLON.StandardMaterial(`${name}_labelMat`, scene);
            labelMat.diffuseTexture = dt;
            labelMat.emissiveTexture = dt;
            labelMat.useAlphaFromDiffuseTexture = true;
            labelMat.disableLighting = true;

            labelPlane.material = labelMat;

            return box;
        };

        // Define our fixed zone colors
        const greenColor = new BABYLON.Color3(0, 1, 0); // Render
        const yellowColor = new BABYLON.Color3(1, 1, 0); // Load
        const redColor = new BABYLON.Color3(1, 0, 0); // Dispose

        // 1. Render Box: Green, Thick line
        createCleanBox(`render_${chunk.name}`, chunk.renderMargin, chunk.renderMargin, 1.0, 10.0, `${chunk.name} [RENDER]`, greenColor, "#00FF00");

        // 2. Load Box: Yellow, Medium thickness, 40% transparent
        createCleanBox(`load_${chunk.name}`, chunk.horizontalLoad, chunk.verticalLoad, 0.8, 8.0, `${chunk.name} [LOAD]`, yellowColor, "#FFFF00");

        // 3. Dispose Box: Red, Thin, 15% transparent
        createCleanBox(`dispose_${chunk.name}`, chunk.horizontalDispose, chunk.verticalDispose, 0.6, 6.0, `${chunk.name} [DISPOSE]`, redColor, "#FF0000");
    });
}