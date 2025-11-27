#!/usr/bin/env python3
"""
PyTorch/TensorFlow to ONNX Conversion Script
Converts AI models to ONNX format for browser inference
"""

import os
import sys
import json
from pathlib import Path

def check_dependencies():
    """Check if required packages are installed"""
    required = {
        'torch': 'PyTorch',
        'onnx': 'ONNX',
        'onnxruntime': 'ONNX Runtime'
    }

    missing = []
    for package, name in required.items():
        try:
            __import__(package)
            print(f"✅ {name} installed")
        except ImportError:
            missing.append(name)
            print(f"❌ {name} NOT installed")

    if missing:
        print(f"\n⚠️  Missing packages: {', '.join(missing)}")
        print("\nInstall with:")
        print("  pip install torch onnx onnxruntime")
        return False

    return True

def convert_pytorch_to_onnx(model_path, output_path, input_shape):
    """Convert PyTorch model to ONNX"""
    import torch
    import torch.onnx

    print(f"\n🔄 Converting PyTorch model: {model_path}")

    try:
        # Load PyTorch model
        model = torch.load(model_path, map_location='cpu')
        model.eval()

        # Create dummy input
        dummy_input = torch.randn(*input_shape)

        # Export to ONNX
        torch.onnx.export(
            model,
            dummy_input,
            output_path,
            export_params=True,
            opset_version=13,
            do_constant_folding=True,
            input_names=['input'],
            output_names=['output'],
            dynamic_axes={
                'input': {0: 'batch_size'},
                'output': {0: 'batch_size'}
            }
        )

        print(f"✅ Converted to ONNX: {output_path}")
        return True

    except Exception as e:
        print(f"❌ Conversion failed: {e}")
        return False

def optimize_onnx_model(model_path, output_path):
    """Optimize ONNX model for browser inference"""
    try:
        import onnx
        from onnx import optimizer

        print(f"\n⚡ Optimizing ONNX model: {model_path}")

        # Load model
        model = onnx.load(model_path)

        # Optimize
        passes = [
            'eliminate_identity',
            'eliminate_nop_transpose',
            'eliminate_nop_pad',
            'fuse_consecutive_transposes',
            'fuse_transpose_into_gemm',
        ]

        optimized_model = optimizer.optimize(model, passes)

        # Save optimized model
        onnx.save(optimized_model, output_path)

        original_size = os.path.getsize(model_path)
        optimized_size = os.path.getsize(output_path)
        reduction = (1 - optimized_size / original_size) * 100

        print(f"✅ Optimized model saved: {output_path}")
        print(f"   Original: {original_size / 1024 / 1024:.2f} MB")
        print(f"   Optimized: {optimized_size / 1024 / 1024:.2f} MB")
        print(f"   Reduction: {reduction:.1f}%")

        return True

    except Exception as e:
        print(f"❌ Optimization failed: {e}")
        return False

def validate_onnx_model(model_path):
    """Validate ONNX model"""
    try:
        import onnx

        print(f"\n🔍 Validating ONNX model: {model_path}")

        # Load and check model
        model = onnx.load(model_path)
        onnx.checker.check_model(model)

        # Print model info
        print("✅ Model is valid!")
        print(f"   Graph inputs: {len(model.graph.input)}")
        print(f"   Graph outputs: {len(model.graph.output)}")
        print(f"   Nodes: {len(model.graph.node)}")

        return True

    except Exception as e:
        print(f"❌ Validation failed: {e}")
        return False

def test_inference(model_path, input_shape):
    """Test ONNX Runtime inference"""
    try:
        import onnxruntime as ort
        import numpy as np

        print(f"\n🧪 Testing inference: {model_path}")

        # Create inference session
        session = ort.InferenceSession(model_path)

        # Get input/output names
        input_name = session.get_inputs()[0].name
        output_name = session.get_outputs()[0].name

        # Create dummy input
        dummy_input = np.random.randn(*input_shape).astype(np.float32)

        # Run inference
        result = session.run([output_name], {input_name: dummy_input})

        print(f"✅ Inference successful!")
        print(f"   Input shape: {dummy_input.shape}")
        print(f"   Output shape: {result[0].shape}")

        return True

    except Exception as e:
        print(f"❌ Inference test failed: {e}")
        return False

def main():
    print("🚀 ONNX Model Converter for RAVR AI")
    print("=" * 60)

    if not check_dependencies():
        print("\nℹ️  Install dependencies first!")
        sys.exit(1)

    print("\n" + "=" * 60)
    print("CONVERSION EXAMPLES")
    print("=" * 60)

    print("""
Example 1: Convert Demucs model
-------------------------------
from demucs import pretrained
model = pretrained.get_model('htdemucs')
# Then use convert_pytorch_to_onnx()

Example 2: Convert AudioSR model
---------------------------------
from audiosr import AudioSR
model = AudioSR(device='cpu')
# Then use convert_pytorch_to_onnx()

Example 3: Convert DDSP model
------------------------------
import tensorflow as tf
# Load TF model and convert using tf2onnx

For full conversion pipeline:
------------------------------
1. Download pretrained weights
2. Load model in PyTorch/TensorFlow
3. Convert to ONNX
4. Optimize for web
5. Validate and test
6. Upload to CDN
""")

    print("\n📋 Recommended workflow:")
    print("   1. Use download-ai-models.py to get pretrained weights")
    print("   2. Modify this script with model-specific code")
    print("   3. Run conversion and optimization")
    print("   4. Test with ONNX Runtime")
    print("   5. Upload to GitHub Releases or CDN")
    print("   6. Update manifest.json with real URLs and checksums")

if __name__ == "__main__":
    main()
